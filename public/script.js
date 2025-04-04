// public/script.js
console.log("摄影师 Alex Chen 的作品集页面加载完成。");

// 示例：给导航链接添加点击效果或平滑滚动
document.querySelectorAll('header nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        // 如果是页内链接，可以阻止默认行为并手动滚动
        // (虽然 CSS scroll-behavior: smooth 已经处理了大部分情况)
        const href = this.getAttribute('href');
        if (href.startsWith('#')) {
             // e.preventDefault(); // 可能不需要，取决于是否要改变 URL hash
            console.log(`Navigating to ${href}`);
            // 可以添加额外的 JS 动画或逻辑
        }
    });
});

// 示例：图片懒加载或画廊效果可以在这里实现
// ...