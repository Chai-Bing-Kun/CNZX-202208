from PIL import Image
import os

def batch_compress_png(max_size_kb=300, max_width=1200):
    """
    批量压缩当前目录下的PNG图片
    
    参数:
        max_size_kb: 目标最大文件大小(KB)，默认300KB
        max_width: 图片最大宽度(像素)，默认1200
    """
    # 创建压缩输出文件夹
    output_folder = "compressed_images"
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # 获取当前目录下所有PNG文件并按数字排序
    image_files = sorted(
        [f for f in os.listdir('.') if f.lower().endswith('.png')],
        key=lambda x: int(x.split('.')[0])
    )
    
    for filename in image_files:
        output_path = os.path.join(output_folder, filename)
        
        try:
            # 打开图片
            img = Image.open(filename)
            
            # 调整图片尺寸
            if img.size[0] > max_width:
                ratio = max_width / img.size[0]
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # 压缩图片质量
            quality = 85  # 初始质量
            while True:
                # 临时保存到内存检查大小
                temp_buffer = os.path.join(output_folder, f"temp_{filename}")
                img.save(temp_buffer, format='PNG', quality=quality, optimize=True)
                
                # 检查文件大小
                size_kb = os.path.getsize(temp_buffer) / 1024
                
                # 达到目标或质量过低则停止
                if size_kb <= max_size_kb or quality <= 20:
                    os.rename(temp_buffer, output_path)
                    print(f"压缩成功: {filename} → {size_kb:.1f}KB")
                    break
                
                # 降低质量继续尝试
                quality -= 5
                os.remove(temp_buffer)
                
        except Exception as e:
            print(f"处理 {filename} 时出错: {str(e)}")

if __name__ == "__main__":
    print("开始批量压缩当前目录下的PNG图片...")
    batch_compress_png()
    print("压缩完成！结果保存在compressed_images文件夹")