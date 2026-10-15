const menu = document.getElementById('menu');
const btn = document.querySelector('.menu-btn');

function setMenu(open) {
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
}
btn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', e => { if (e.target.tagName === 'A') setMenu(false); });

// Los botones de cada mascota preseleccionan el interés en el formulario
const select = document.getElementById('mascota');
document.querySelectorAll('[data-pet]').forEach(a =>
    a.addEventListener('click', () => { select.value = a.dataset.pet; })
);

document.getElementById('year').textContent = new Date().getFullYear();

// Formulario: abre el correo del usuario con el mensaje listo (no requiere servidor)
const form = document.getElementById('form');
const ok = document.getElementById('ok');
form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const body = `Nombre: ${d.get('nombre')}\nCorreo: ${d.get('email')}\nMe interesa: ${d.get('mascota')}\n\n${d.get('mensaje')}`;
    location.href = 'mailto:contacto@patitas.org?subject=' +
        encodeURIComponent('Contacto desde la web de Patitas') +
        '&body=' + encodeURIComponent(body);
    ok.hidden = false;
    form.reset();
});
