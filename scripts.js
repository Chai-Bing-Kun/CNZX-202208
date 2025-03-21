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
});