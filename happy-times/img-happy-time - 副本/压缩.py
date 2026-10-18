from PIL import Image
import os

def ask_confirmation(prompt):
    """询问用户是否继续"""
    while True:
        choice = input(f"{prompt} (y/n): ").lower()
        if choice in ('y', 'yes'):
            return True
        elif choice in ('n', 'no'):
            return False
        print("无效输入，请输入 y/n")

def get_compression_quality():
    """获取用户指定的压缩质量"""
    while True:
        try:
            quality = int(input("请输入压缩质量（1-100，推荐60-90）："))
            if 1 <= quality <= 100:
                return quality
            print("请输入1-100之间的整数")
        except ValueError:
            print("请输入有效的数字")

def compress_and_overwrite(folder_path, quality):
    """批量压缩并覆盖原文件"""
    for filename in os.listdir(folder_path):
        if filename.lower().endswith('.png'):
            file_path = os.path.join(folder_path, filename)
            try:
                with Image.open(file_path) as img:
                    if img.mode in ('RGBA', 'P'):
                        img = img.convert('RGB')
                    img.save(file_path, optimize=True, quality=quality)
                print(f"压缩完成: {filename}")
            except Exception as e:
                print(f"处理失败 {filename}: {str(e)}")

if __name__ == "__main__":
    # 1. 询问是否开始压缩
    if not ask_confirmation("发现PNG文件，是否开始压缩？"):
        print("操作已取消")
        exit()

    # 2. 获取压缩质量
    quality = get_compression_quality()

    # 3. 二次确认
    print(f"即将以质量{quality}压缩所有PNG文件（直接覆盖原文件）")
    if not ask_confirmation("确认继续吗？"):
        print("操作已取消")
        exit()

    # 4. 执行压缩
    target_folder = r"F:\cursor\初中\happy-times\img-happy-time"  # 替换为实际路径
    compress_and_overwrite(target_folder, quality)
    print("所有图片处理完成！")