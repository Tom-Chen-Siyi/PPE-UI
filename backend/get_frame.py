import cv2
import os
import sys
from PIL import Image

# 强制实时输出，不缓冲
import sys
sys.stdout.reconfigure(line_buffering=True)

def extract_frames(video_path, output_dir, every_n=1):
    """
    Extract frames from a video and save them as PNG images.
    :param video_path: Path to the video file.
    :param output_dir: Directory to save the extracted frames.
    :param every_n: Save every nth frame (default: every frame).
    :return: Total number of frames extracted.
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"Error: Could not open video file {video_path}")
        return 0
    
    # Get video information
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) #视频总帧数
    fps = cap.get(cv2.CAP_PROP_FPS) #视频帧率
    duration = total_frames / fps if fps > 0 else 0 #视频时长
    
    print(f"Video info: {total_frames} frames, {fps:.2f} fps, {duration:.2f} seconds")
    
    idx = 0
    saved = 0
    last_progress = 0
    
    while True:
        ret, frame = cap.read() #读取视频帧
        if not ret:
            break
            
        if idx % every_n == 0:
            try:
                img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(img)
                fname = os.path.join(output_dir, f"{idx:05d}.png")
                pil_img.save(fname)
                saved += 1
                
                # Output progress every 20 frames
                if saved % 20 == 0:
                    progress = (idx / total_frames) * 100 if total_frames > 0 else 0
                    print(f"Progress: {progress:.1f}% ({saved} frames saved)", flush=True)
                    last_progress = progress
                        
            except Exception as e:
                print(f"Error saving frame {idx}: {e}")
                
        idx += 1

    # 新增：确保最后一批帧也输出一次进度
    if saved % 20 != 0 and total_frames > 0:
        progress = (idx / total_frames) * 100
        print(f"Progress: {progress:.1f}% ({saved} frames saved)", flush=True)
    
    cap.release()
    print(f"Frame extraction completed: {saved} frames saved to {output_dir}")
    return saved

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python get_frame.py <video_path> <output_dir> [every_n]")
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_dir = sys.argv[2]
    every_n = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    
    if not os.path.exists(video_path):
        print(f"Error: Video file {video_path} does not exist")
        sys.exit(1)
    
    print(f"Starting frame extraction...")
    print(f"Video: {video_path}")
    print(f"Output: {output_dir}")
    print(f"Every {every_n} frame(s)")
    
    try:
        n = extract_frames(video_path, output_dir, every_n)
        print(f"Successfully extracted {n} frames to {output_dir}")
    except Exception as e:
        print(f"Error during frame extraction: {e}")
        sys.exit(1)
