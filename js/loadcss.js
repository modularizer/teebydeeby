if (!window.loadcssimported) {

document.addEventListener('DOMContentLoaded', function() {
    // add a stylesheet from a string
    let css = `
    %CSS%
    `;

    let head = document.head || document.getElementsByTagName('head')[0];
    let style = document.createElement('style');
    style.type = 'text/css';

    if (style.styleSheet){
        // This is required for IE8 and below.
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
});
    window.loadcssimported = true;
}