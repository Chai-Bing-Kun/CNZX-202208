// 添加滚动淡入效果
document.addEventListener('DOMContentLoaded', function () {
    const cards = document.querySelectorAll('.card');
    const aboutUs = document.querySelector('.about-us');

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        {
            threshold: 0.1, // 当元素 10% 进入视口时触发
        }
    );

    cards.forEach((card) => {
        observer.observe(card);
    });

    observer.observe(aboutUs);

    // 检测是否为移动设备并调整轮播图高度
    function adjustCarouselForMobile() {
        const carousel = document.querySelector('.carousel');
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (isMobile) {
            carousel.style.height = '50vh'; // 在移动设备上减少轮播图高度
        } else {
            carousel.style.height = '100vh'; // 在桌面设备上恢复全高
        }
    }

    // 初始调整
    adjustCarouselForMobile();

    // 监听窗口大小变化
    window.addEventListener('resize', adjustCarouselForMobile);
});