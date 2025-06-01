const showMenu = (toggleId, navbarId, bodyId) => {
    const toggle = document.getElementById(toggleId);
    const navbar = document.getElementById(navbarId);
    const bodypadding = document.getElementById(bodyId);

    if(toggle && navbar) {
        toggle.addEventListener('click', () => {
            navbar.classList.toggle('show');
            toggle.classList.toggle('rotate');
            bodypadding.classList.toggle('expander');
        })
    }
}

showMenu('nav-toggle', 'navbar', 'body');

// Active Link Color

const linkColor = document.querySelectorAll('.nav-link');

function colorLink() {
    linkColor.forEach(l => l.classList.remove('active'))
    this.classList.add('active');
}

linkColor.forEach(l => l.addEventListener('click', colorLink));