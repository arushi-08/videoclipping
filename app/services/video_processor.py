import asyncio
import hashlib
import json
import os
import re
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path

import whisper
from moviepy.audio.AudioClip import CompositeAudioClip
from moviepy.audio.fx.all import audio_loop, volumex
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy.editor import (ColorClip, CompositeVideoClip, TextClip,
                            VideoFileClip, concatenate_videoclips)
from werkzeug.utils import secure_filename

from app.config import Settings
from app.mcp_protocol import mcp_registry
from app.tools import *


class VideoProcessor:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.active_tasks = {}
        self.file_versions = {}
        self.mcp_registry = mcp_registry

        self.mcp_registry.register("remove_duplicates", RemoveDuplicatesTool)
        self.mcp_registry.register("add_captions", CaptionTool)
        self.mcp_registry.register("add_music", MusicTool)
        self.mcp_registry.register("add_broll", BrollTool)
        

    def get_file_version(self, file_id, processing_steps):
        sorted_steps = json.dumps(processing_steps, sort_keys=True)
        return f"{file_id}-{hashlib.md5(sorted_steps.encode()).hexdigest()[:8]}"


    @lru_cache(maxsize=32)
    def transcribe_video(self, file_path):
        model = whisper.load_model(self.settings.WHISPER_MODEL)
        return model.transcribe(str(file_path), word_timestamps=True)
    
    
    @staticmethod
    def handle_processing(processing_step: str):
        def decorator(func):
            async def wrapper(self, task_id: str, file_id: str, *args, **kwargs):
                # Common setup

                result_template = {
                    "output_filename": "",
                    "download_url": f"/api/files/download/{file_id}/",
                    "message": f"{processing_step.replace('_', ' ').title()} completed",
                    "output_type": f"{processing_step}_video"
                }

                cached = self.file_versions.get(file_id, {})
                existing_steps = cached.get('processing_steps', [])

                # Check cache first
                if processing_step in cached:
                    self.active_tasks[task_id] = {
                        "status": "completed",
                        "result": {
                            **cached,
                            "output_filename": Path(cached['output_path']).name,
                            "download_url": f"{cached['download_url']}{Path(cached['output_path']).name}",
                            "message": f"{processing_step.replace('_', ' ').title()} (cached)",

                        }
                    }
                    return

                # Execute the actual processing
                # try:
                result = await func(self, task_id, file_id, *args, **kwargs)
                
                new_steps = existing_steps + [processing_step]
                # Update cache
                self.file_versions[file_id] = {
                    'output_path': str(result['output_path']),
                    'segments_path': result.get('segments_path') or cached.get('segments_path',''),
                    'processing_steps': new_steps
                }

                # Set task status
                self.active_tasks[task_id] = {
                    "status": "completed",
                    "result": {
                        **result_template,
                        "output_filename": Path(result['output_path']).name,
                        "download_url": f"{result_template['download_url']}{Path(result['output_path']).name}",
                        'processing_steps': new_steps
                    }
                }

                # except (IOError, OSError) as e:
                #     print(f"File operation failed: {str(e)}")
                #     self.active_tasks[task_id] = {
                #         "status": "failed",
                #         "error": str(e)
                #     }
                # except Exception as e:
                #     print(f"Unexpected error: {str(e)}")
                #     self.active_tasks[task_id] = {
                #         "status": "failed",
                #         "error": str(e)
                #     }

            return wrapper
        return decorator

    @handle_processing('remove_duplicates')
    async def process_remove_duplicates(self, task_id: str, file_id: str, params: dict):
        
        settings = self.settings
        input_path = Path(settings.UPLOAD_DIR) / file_id / params.get('filename')
        output_path = Path(settings.PROCESSED_DIR) / file_id
        output_path.mkdir(parents=True, exist_ok=True)
        dedupe_threshold = params.get('dedupe_threshold', settings.DEFAULT_DUP_THRESH)
        if not dedupe_threshold:
            dedupe_threshold = settings.DEFAULT_DUP_THRESH

        segments = self.transcribe_video(input_path).get('segments', [])

        filtered_segments = await asyncio.get_running_loop().run_in_executor(
            None,
            self.remove_adjacent_duplicates,
            segments,
            dedupe_threshold
        )

        video = VideoFileClip(str(input_path))
        clips = [video.subclip(s['start'], s['end']) for s in filtered_segments]

        # clips = []

        # for i, s in enumerate(filtered_segments):
        #     # Default padding
        #     pad_before = 0.2
        #     pad_after = 0.3

        #     # Adjust padding based on next segment
        #     if i < len(filtered_segments) - 1:
        #         next_start = filtered_segments[i + 1]['start']
        #         gap = next_start - s['end']
        #         # Reduce padding if segments are close
        #         if gap < 0.5:
        #             pad_after = min(pad_after, gap / 2)
        #     start = max(0, s['start'] - pad_before)
        #     end = s['end'] + pad_after
        #     # Ensure end does not exceed video duration
        #     if i == len(filtered_segments) - 1:
        #         end = min(end, video.duration)

        #     clips.append(video.subclip(start, end))
        # print('clips', clips)
        if clips:
            # clips = [clips[0]]+[clip.crossfadein(0.05) for clip in clips[1:]]
            cleaned = concatenate_videoclips(clips, method="compose", padding=-0.005)
        else:
            cleaned = ColorClip((640, 480), color=(0,0,0), duration=0)

        output_path = Path(settings.PROCESSED_DIR) / file_id / f"processed_{input_path.stem}.mp4"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with cleaned as cleaned_clip:
            cleaned_clip.write_videofile(
                str(output_path),
                codec='libx264',
                audio_codec='aac',
                threads=4,
                write_logfile=True,
                ffmpeg_params=[
                    '-movflags', '+faststart',        # REQUIRED for web playback
                    '-pix_fmt', 'yuv420p',           # REQUIRED for browser compatibility
                    '-vsync', 'vfr',                 # Better for edited content
                    '-x264-params', 'b-adapt=2',     # Keep adaptive B-frame decision
                    '-crf', '23',                    # Quality/compression balance
                    '-profile:v', 'main',           # Broad device compatibility
                    '-level', '4.0',                # H.264 level for wide support
                    '-b:a', '192k',                 # Keep your audio bitrate
                    '-aq', '90'                     # Audio quality VBR
                ],
                preset='fast',
                audio_fps=44100,
                temp_audiofile=str(Path(output_path).with_suffix('.tmp.m4a')),
                remove_temp=False  # Helps prevent premature file closure
            )
        segments_path = Path(settings.PROCESSED_DIR) / file_id / f"{input_path.stem}_segments.json"
        # segments_path.parent.mkdir(parents=True, exist_ok=True) 

        with open(segments_path, 'w') as f:
            json.dump(filtered_segments, f, indent=2)

        return {
            'output_path': output_path,
            'segments_path': segments_path,
            'processing_step': 'remove_duplicates'
        }

    @handle_processing('add_captions')
    async def add_captions(self, task_id:str, file_id: str, params: dict):
        # Get input path - use processed file if available, otherwise use original uploaded file
        cached = self.file_versions.get(file_id, {})
        input_path = cached.get('output_path')
        segments_path = cached.get('segments_path')
        
        if not input_path:
            # No processed file yet, use original uploaded file
            input_path = Path(self.settings.UPLOAD_DIR) / file_id / params.get('filename')
            if not input_path.exists():
                raise FileNotFoundError(f"Input video file not found: {input_path}")
            
            # Generate segments for original video
            transcript = self.transcribe_video(str(input_path))
            segments = transcript.get('segments', [])
            
            # Save segments to file
            segments_path = Path(self.settings.PROCESSED_DIR) / file_id / "segments.json"
            segments_path.parent.mkdir(parents=True, exist_ok=True)
            with open(segments_path, 'w') as f:
                json.dump(segments, f)
        
        # Set output path in processed directory
        output_path = Path(self.settings.PROCESSED_DIR) / file_id / f"processed_{params.get('filename')}"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        temp_path = Path(output_path).with_suffix('.tmp.mp4')

        # Load video and segments
        video = VideoFileClip(str(input_path))
        with open(segments_path, 'r') as f:
            segments = json.load(f)

        # Calculate new start times
        new_starts = []
        current_time = 0.0
        for seg in segments:
            new_starts.append(current_time)
            current_time += seg['end'] - seg['start']
        
        # Create captions
        overlays = self.create_captions(
            video, 
            segments, 
            new_starts, 
            params.get('font_size', self.settings.DEFAULT_FONT_SIZE)
        )
        
        final = CompositeVideoClip([video] + overlays)
        with final as final_clip:
            final_clip.write_videofile(
                str(temp_path),
                codec='libx264',
                audio_codec='aac',
                threads=4,
                write_logfile=True,
                ffmpeg_params=[
                    '-movflags', '+faststart',        # REQUIRED for web playback
                    '-pix_fmt', 'yuv420p',           # REQUIRED for browser compatibility
                    '-vsync', 'vfr',                 # Better for edited content
                    '-x264-params', 'b-adapt=2',     # Keep adaptive B-frame decision
                    '-crf', '23',                    # Quality/compression balance
                    '-profile:v', 'main',           # Broad device compatibility
                    '-level', '4.0',                # H.264 level for wide support
                    '-b:a', '192k',                 # Keep your audio bitrate
                    '-aq', '90'                     # Audio quality VBR
                ],
                preset='fast',
                audio_fps=44100,
                temp_audiofile=str(Path(output_path).with_suffix('.tmp.m4a')),
                remove_temp=False  # Helps prevent premature file closure
            )
            os.replace(str(temp_path), str(output_path))

        return {
            'output_path': str(output_path),
            'segments_path': str(segments_path),
            'processing_step': 'add_captions'
        }
    
    @handle_processing('add_music')
    async def add_music(self, task_id: str, file_id: str, params: dict):
        print(f"=== ADD MUSIC FUNCTION STARTED ===")
        print(f"Task ID: {task_id}")
        print(f"File ID: {file_id}")
        print(f"Params: {params}")
        
        # Get input path - use processed file if available, otherwise use original uploaded file
        cached = self.file_versions.get(file_id, {})
        input_path = cached.get('output_path')
        
        print(f"Cached file versions: {cached}")
        print(f"Input path from cache: {input_path}")
        
        if not input_path:
            # No processed file yet, use original uploaded file
            filename = params.get('filename')
            print(f"Filename from params: {filename}")
            
            if not filename:
                raise ValueError("Filename parameter is required but not provided")
                
            input_path = Path(self.settings.UPLOAD_DIR) / file_id / filename
            print(f"Constructed input path: {input_path}")
            
            if not input_path.exists():
                raise FileNotFoundError(f"Input video file not found: {input_path}")
        
        # Set output path in processed directory
        filename = params.get('filename', 'processed_video.mp4')
        output_path = Path(self.settings.PROCESSED_DIR) / file_id / f"processed_{filename}"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"Output path: {output_path}")

        temp_path = Path(output_path).with_suffix('.tmp.mp4')

        # Get music file path (separate from versioned video files)
        music_file_id = params.get("music_file_id")
        music_filename = params.get("music_filename")
        
        print(f"Music file ID: {music_file_id}")
        print(f"Music filename: {music_filename}")
        
        if not music_file_id or not music_filename:
            raise ValueError("Music file ID and filename are required")
            
        music_path = Path(self.settings.MUSIC_UPLOAD_DIR) / music_file_id / music_filename
        
        print(f"Music path: {music_path}")
        
        if not music_path.exists():
            raise FileNotFoundError(f"Music file not found: {music_path}")
        
        # Actual unique processing logic
        print("Loading video file...")
        video = VideoFileClip(str(input_path))
        print(f"Video loaded, duration: {video.duration}")
        
        print("Loading music file...")
        music = AudioFileClip(str(music_path))
        print(f"Music loaded, duration: {music.duration}")
        
        # Apply audio loop
        try:
            music = music.fx(audio_loop, duration=video.duration)
            print(f"Music after loop, duration: {music.duration}")
        except Exception as e:
            print(f"Error applying audio loop: {e}")
            print("Continuing without audio loop")
        
        # Apply volume effect with error handling
        try:
            volume_factor = float(params.get("music_volume", 0.3))
            music = music.fx(volumex, volume_factor)
            print("Music volume applied successfully")
        except Exception as e:
            print(f"Error applying volume effect: {e}")
            print("Continuing without volume adjustment")
        
        print("Music loaded and processed")
        
        print("Creating composite audio...")
        composite_audio = CompositeAudioClip([video.audio, music.set_start(0)])
        final = video.set_audio(composite_audio)
        
        print("Writing final video...")
        with final as final_clip:
            final_clip.write_videofile(
                str(temp_path),
                codec='libx264',
                audio_codec='aac',
                threads=4,
                write_logfile=True,
                ffmpeg_params=[
                    '-movflags', '+faststart',        # REQUIRED for web playback
                    '-pix_fmt', 'yuv420p',           # REQUIRED for browser compatibility
                    '-vsync', 'vfr',                 # Better for edited content
                    '-x264-params', 'b-adapt=2',     # Keep adaptive B-frame decision
                    '-crf', '23',                    # Quality/compression balance
                    '-profile:v', 'main',           # Broad device compatibility
                    '-level', '4.0',                # H.264 level for wide support
                    '-b:a', '192k',                 # Keep your audio bitrate
                    '-aq', '90'                     # Audio quality VBR
                ],
                preset='fast',
                audio_fps=44100,
                temp_audiofile=str(Path(output_path).with_suffix('.tmp.m4a')),
                remove_temp=False  # Helps prevent premature file closure
            )
            os.replace(str(temp_path), str(output_path))

        print(f"=== ADD MUSIC FUNCTION COMPLETED ===")
        print(f"Output file: {output_path}")

        return {
            'output_path': str(output_path),
            'processing_step': 'add_music'
        }

    @handle_processing('add_broll')
    async def add_broll(self, task_id: str, file_id: str, params: dict):
        # Get input path - use processed file if available, otherwise use original uploaded file
        cached = self.file_versions.get(file_id, {})
        input_path = cached.get('output_path')
        
        if not input_path:
            # No processed file yet, use original uploaded file
            input_path = Path(self.settings.UPLOAD_DIR) / file_id / params.get('filename')
            if not input_path.exists():
                raise FileNotFoundError(f"Input video file not found: {input_path}")
        
        # Set output path in processed directory
        output_path = Path(self.settings.PROCESSED_DIR) / file_id / f"processed_{params.get('filename')}"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        temp_path = Path(output_path).with_suffix('.tmp.mp4')

        main_clip = VideoFileClip(str(input_path))

        transcript = self.transcribe_video(str(input_path)).get('segments', [])

        final_video = self.smart_broll_insertion(
            main_clip,
            transcript,
            params['keywords']
        )

        with final_video as final_clip:
            final_clip.write_videofile(
                str(temp_path),
                codec='libx264',
                audio_codec='aac',
                threads=4,
                ffmpeg_params=[
                    '-movflags', '+faststart',        # REQUIRED for web playback
                    '-pix_fmt', 'yuv420p',           # REQUIRED for browser compatibility
                    '-vsync', 'vfr',                 # Better for edited content
                    '-x264-params', 'b-adapt=2',     # Keep adaptive B-frame decision
                    '-crf', '23',                    # Quality/compression balance
                    '-profile:v', 'main',           # Broad device compatibility
                    '-level', '4.0',                # H.264 level for wide support
                    '-b:a', '192k',                 # Keep your audio bitrate
                    '-aq', '90'                     # Audio quality VBR
                ],
                preset='fast',
                audio_fps=44100,
                temp_audiofile=str(Path(output_path).with_suffix('.tmp.m4a')),
                remove_temp=False  # Helps prevent premature file closure
            )
            os.replace(str(temp_path), str(output_path))

        return {
            'output_path': str(output_path),
            'processing_step': 'add_broll'
        }
    
    def remove_adjacent_duplicates(self, segments, dup_threshold):
        """Keep last segment in duplicate groups for natural flow"""
        kept = []
        i = 0
        n = len(segments)
        
        while i < n:
            group = [segments[i]]
            j = i + 1
            
            # Expand group while duplicates are found
            while j < n and self.is_duplicate(group[-1]['text'], segments[j]['text'], dup_threshold):
                group.append(segments[j])
                j += 1
                
            # Keep only the LAST segment in the group
            kept.append(group[-1])
            
            print(f"Grouped {len(group)} segments:")
            for seg in group:
                print(f"  - {seg['text']} (confidence: {seg.get('avg_logprob', '?')})")
            print(f"Kept: {group[-1]}\n{'-'*40}")
            
            i = j  # Move to next unprocessed segment
        
        return kept

    def normalize(self, text: str) -> str:
        text = re.sub(r'[^a-zA-Z0-9]', ' ', text)
        return re.sub(r'\s+', ' ', text).strip().lower()
    
    def is_duplicate(self, a: str, b: str, threshold: float) -> bool:
        """Check for either:
        1. High similarity ratio, OR
        2. One phrase starts with the other (with minimum overlap)
        """
        print('CHECK dedupe threshold', threshold)
        norm_a, norm_b = self.normalize(a), self.normalize(b)
        
        # Calculate base similarity
        base_ratio = SequenceMatcher(None, norm_a, norm_b).ratio()
        if base_ratio >= threshold:
            return True
        
        # Check for prefix/suffix overlap
        min_len = min(len(norm_a), len(norm_b))
        overlap_threshold = 0.8  # 80% of shorter phrase must match
        
        # Find maximum matching prefix
        prefix_length = 0
        for a_char, b_char in zip(norm_a, norm_b):
            if a_char == b_char:
                prefix_length += 1
            else:
                break
        
        # Check if prefix match meets overlap criteria
        if prefix_length / min_len >= overlap_threshold:
            return True
        
        return False
    

    def create_captions(self, video, segments, new_starts, font_size=28):
        """Generate Instagram-style captions with fixed dimension handling"""
        overlays = []
        vid_w, vid_h = video.size
        vid_w, vid_h = int(vid_w), int(vid_h)  # Ensure video dimensions are integers
        
        # Instagram-style parameters (converted to integers)
        CAPTION_WIDTH = int(vid_w * 0.9)
        BOTTOM_MARGIN = int(vid_h * 0.08)
        BG_OPACITY = 0
        FONT = "Arial-Bold"  # Simplified font selection

        for seg, start_time in zip(segments, new_starts):
            duration = seg['end'] - seg['start']
            text = seg['text'].strip()

            # Create base text clip
            base_text = TextClip(
                text,
                fontsize=font_size,
                color='white',
                font=FONT,
                size=(CAPTION_WIDTH, None),
                method='caption',
                align='center',
                stroke_color='black',
                stroke_width=1
            ).set_duration(duration)

            # Calculate background dimensions as integers
            bg_width = int(base_text.w * 1.1)
            bg_height = int(base_text.h * 1.2)
            
            # Create background with explicit integer size
            bg = ColorClip(
                size=(bg_width, bg_height),
                color=(0, 0, 0),
                duration=duration
            ).set_opacity(BG_OPACITY)

            # Composite and position elements
            caption_clip = CompositeVideoClip([
                bg.set_position('center'),
                base_text.set_position('center')
            ]).set_position(('center', vid_h - BOTTOM_MARGIN - bg_height))

            overlays.append(caption_clip.set_start(start_time))

        return overlays

    # def get_output_path(self, input_path, file_id):
    #     out_filename = f"{Path(input_path).stem}.mp4"
    #     if "processed" not in out_filename:
    #         out_filename = f"processed_{Path(input_path).stem}.mp4"
    #     return Path(self.settings.PROCESSED_DIR) / file_id / out_filename


    def add_background_music(self, video_clip, music_file, music_volume=0.3):
        """Add background music with proper volume balancing"""
        # Load and prepare music
        music = (
            AudioFileClip(os.path.join('bg_music', music_file) )
            .fx(audio_loop, duration=video_clip.duration)
            .fx(volumex, music_volume)
        )
        
        # Mix audio tracks
        composite_audio = CompositeAudioClip([
            video_clip.audio,
            music.set_start(0)
        ])
        
        return video_clip.set_audio(composite_audio)

    def fetch_broll_from_local(self, keyword, main_clip, duration=5, broll_dir="brolls"):
        """Maintain B-roll aspect ratio with smart padding"""
        # try:
        safe_keyword = secure_filename(keyword)
        broll_files = [f for f in os.listdir(broll_dir)
                        if safe_keyword in f.lower() and f.endswith(".mp4")]
        if not broll_files:
            return None

        raw = VideoFileClip(os.path.join(broll_dir, broll_files[0]), audio=False)
        clip = raw.subclip(0, min(duration, raw.duration))

        main_w, main_h = main_clip.size
        broll_w, broll_h = clip.size

        print(f"\nkeyword {keyword} | DEBUG: Main={main_w}x{main_h} | B-roll={broll_w}x{broll_h}")

        width_ratio  = main_w  / broll_w
        height_ratio = main_h / broll_h

        # 2) Decide which axis “fills” first, and compute integer dims
        if width_ratio < height_ratio:
            # B‑roll is relatively taller → fit to full width
            new_w = main_w
            new_h = int(broll_h * width_ratio)
        else:
            # B‑roll is relatively wider → fit to full height
            new_w = int(broll_w * height_ratio)
            new_h = main_h

        print(f"Scaled to {new_w}x{new_h}")

        fitted = clip.resize((new_w, new_h))

        # 3. Create centered composite with padding
        background = ColorClip((main_w, main_h), color=(0,0,0), duration=duration)
        output = CompositeVideoClip([
                        background,
                        fitted.set_position("center")
                    ]).set_duration(duration)
        if output.duration != main_clip.duration:
            output = output.set_duration(main_clip.duration)

        return output


    def smart_broll_insertion(self, main_clip, segments, keywords):
        """Accurate B-roll insertion at keyword timings"""
        broll_overlays = []
        split_points = self.find_split_points(segments, keywords)
        
        for point in split_points:
            split_time = point['split_time']
            broll_duration = 3  # Overlay duration
            
            broll = self.fetch_broll_from_local(point['keyword'], main_clip, duration=broll_duration)
            if broll:
                # Set B-roll to start exactly at split_time with transitions
                broll = (broll.crossfadein(0.3)
                            .crossfadeout(0.3)
                            .set_start(split_time)  # Remove -0.3 adjustment
                            .set_duration(broll_duration))
                broll_overlays.append(broll)

        return CompositeVideoClip([main_clip] + broll_overlays).set_audio(main_clip.audio)


    def find_split_points(self, segments, keywords):
        """Find exact split points based on keyword positions in text"""
        split_points = []
        
        for seg in segments:
            text = seg['text'].strip().lower()
            original_text = seg['text'].strip()
            
            # Check if any keyword exists in this segment
            found_keywords = [kw for kw in keywords if kw.lower() in text]
            if not found_keywords:
                continue
            
            # Find exact positions for each keyword
            for keyword in found_keywords:
                kw_lower = keyword.lower()
                kw_idx = text.find(kw_lower)
                
                if kw_idx == -1:
                    continue
                
                # Calculate timing using word-level data if available
                if 'words' in seg:
                    # Find first matching word with exact case
                    for word in seg['words']:
                        if keyword in word['word']:
                            split_time = word['start']
                            split_points.append({
                                'segment_start': seg['start'],
                                'split_time': split_time,
                                'segment_end': seg['end'],
                                'keyword': keyword
                            })
                            break
                else:
                    # Fallback: Calculate position ratio in text
                    position_ratio = kw_idx / len(original_text)
                    split_time = seg['start'] + (seg['end'] - seg['start']) * position_ratio
                    split_points.append({
                        'segment_start': seg['start'],
                        'split_time': split_time,
                        'segment_end': seg['end'],
                        'keyword': keyword
                    })
        
        return sorted(split_points, key=lambda x: x['split_time'])
    

    async def execute_mcp_command(self, task_id: str, command: dict):
        tool_class = self.mcp_registry.tools.get(command["name"])
        if not tool_class:
            raise ValueError(f"Unknown tool {command['name']}")
        
        tool = tool_class(self)

        result = await tool.invoke(
            task_id,
            command["file_id"],
            command.get("params", {})
        )
        
        self.active_tasks[task_id] = {
            **self.active_tasks.get(task_id, {}),
            **result
        }
    