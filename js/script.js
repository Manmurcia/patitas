const menu = document.getElementById('menu');
const menuButton = document.querySelector('.menu-btn');

function setMenu(open) {
    menu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
}

menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
});

const contactSelect = document.getElementById('mascota');
document.querySelectorAll('[data-pet]').forEach(link => {
    link.addEventListener('click', () => {
        contactSelect.value = link.dataset.pet;
    });
});

document.getElementById('year').textContent = new Date().getFullYear();
const emailLink = document.getElementById('contact-email');
emailLink.textContent = window.PATITAS_CONFIG.contactEmail || 'Pendiente de configurar';
if (window.PATITAS_CONFIG.contactEmail) {
    emailLink.href = `mailto:${window.PATITAS_CONFIG.contactEmail}`;
} else {
    emailLink.removeAttribute('href');
}
const phoneLink = document.getElementById('contact-phone');
phoneLink.textContent = window.PATITAS_CONFIG.contactPhone || 'Pendiente de configurar';
if (window.PATITAS_CONFIG.contactPhone) {
    phoneLink.href = `tel:${window.PATITAS_CONFIG.contactPhone.replace(/[^\d+]/g, '')}`;
}
document.getElementById('opening-hours').textContent =
    window.PATITAS_CONFIG.openingHours || 'Pendiente de configurar';

const searchInput = document.getElementById('buscar-mascota');
const speciesSelect = document.getElementById('tipo-mascota');
const noResults = document.getElementById('sin-resultados');
const petGrid = document.querySelector('.grid-pets');
const catalogStatus = document.getElementById('estado-catalogo');

function filterPets() {
    const query = searchInput.value.trim().toLocaleLowerCase('es');
    const species = speciesSelect.value;
    let visiblePets = 0;

    petGrid.querySelectorAll('.pet').forEach(card => {
        const matchesName = card.dataset.name.toLocaleLowerCase('es').includes(query);
        const matchesSpecies = !species || card.dataset.species === species;
        const visible = matchesName && matchesSpecies;
        card.hidden = !visible;
        if (visible) visiblePets += 1;
    });

    noResults.hidden = visiblePets !== 0;
}

searchInput.addEventListener('input', filterPets);
speciesSelect.addEventListener('change', filterPets);

function createAnimalCard(animal) {
    const card = document.createElement('article');
    card.className = 'pet';
    card.dataset.id = animal.id;
    card.dataset.species = animal.species;
    card.dataset.name = animal.name;

    const image = document.createElement('img');
    image.alt = animal.image_alt || `Foto de ${animal.name}`;
    image.width = 600;
    image.height = 600;
    image.loading = 'lazy';
    if (/^(https:\/\/|\/|img\/)/i.test(animal.image_url || '')) image.src = animal.image_url;

    const info = document.createElement('div');
    info.className = 'pet-info';
    const title = document.createElement('h3');
    title.textContent = animal.name;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = animal.label || animal.species;
    const description = document.createElement('p');
    description.textContent = animal.description;
    const contactLink = document.createElement('a');
    contactLink.className = 'btn btn-sm';
    contactLink.href = '#contacto';
    contactLink.dataset.pet = animal.name;
    contactLink.textContent = 'Quiero conocerlo';
    contactLink.addEventListener('click', () => {
        contactSelect.value = animal.name;
    });

    info.append(title, tag, description, contactLink);
    card.append(image, info);
    return card;
}

async function loadAnimals() {
    if (!window.PatitasApi.isConfigured()) {
        petGrid.querySelectorAll('.pet').forEach(card => {
            card.dataset.name = card.querySelector('h3').textContent;
        });
        return;
    }

    try {
        const animals = await window.PatitasApi.request('/animals?status=available');
        if (!Array.isArray(animals)) throw new Error('La API devolvió un catálogo no válido.');
        petGrid.replaceChildren();
        const nonAnimalChoices = new Set([
            'Información general',
            'Quiero ser voluntario',
            'Quiero apadrinar',
            'Quiero donar'
        ]);
        [...contactSelect.options].forEach(option => {
            if (!nonAnimalChoices.has(option.value)) option.remove();
        });

        animals.forEach(animal => {
            petGrid.append(createAnimalCard(animal));
            const option = document.createElement('option');
            option.value = animal.name;
            option.textContent = animal.name;
            option.dataset.apiAnimal = 'true';
            contactSelect.add(option, contactSelect.options[contactSelect.options.length - 3]);
        });
        filterPets();
    } catch (error) {
        catalogStatus.textContent = `No se pudo actualizar el catálogo: ${error.message} Se muestran los datos de ejemplo.`;
        catalogStatus.hidden = false;
    }
}

loadAnimals();

function createBlogPost(post) {
    const article = document.createElement('article');
    article.className = 'post';
    if (/^(https:\/\/|\/(?!\/)|img\/)/i.test(post.image_url || '')) {
        const image = document.createElement('img');
        image.src = post.image_url;
        image.alt = post.image_alt || '';
        image.width = 900;
        image.height = 600;
        image.loading = 'lazy';
        article.append(image);
    }

    const info = document.createElement('div');
    info.className = 'post-info';
    const title = document.createElement('h3');
    title.textContent = post.title;
    const summary = document.createElement('p');
    summary.textContent = post.summary;
    info.append(title, summary);
    article.append(info);
    return article;
}

async function loadBlogPosts() {
    if (!window.PatitasApi.isConfigured()) return;
    const status = document.getElementById('estado-blog');
    try {
        const posts = await window.PatitasApi.request('/posts?status=published');
        if (!Array.isArray(posts)) throw new Error('La API devolvió una lista de publicaciones no válida.');
        const grid = document.getElementById('grid-blog');
        grid.replaceChildren();
        posts.forEach(post => grid.append(createBlogPost(post)));
    } catch (error) {
        status.textContent = `No se pudo actualizar el contenido: ${error.message} Se muestran los artículos de ejemplo.`;
        status.hidden = false;
    }
}

loadBlogPosts();

const donationLink = document.getElementById('donar');
let contactAddress = window.PATITAS_CONFIG.contactEmail;
if (window.PATITAS_CONFIG.donationUrl) {
    donationLink.href = window.PATITAS_CONFIG.donationUrl;
    donationLink.target = '_blank';
    donationLink.rel = 'noopener noreferrer';
    donationLink.removeAttribute('data-pet');
} else {
    donationLink.textContent = 'Coordinar una donación';
}

const form = document.getElementById('form');
const formStatus = document.getElementById('estado-formulario');

function isHttpsUrl(value) {
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}

async function loadPublicSettings() {
    if (!window.PatitasApi.isConfigured()) return;
    try {
        const settings = await window.PatitasApi.request('/settings');
        if (!settings || typeof settings !== 'object') throw new Error('La configuración recibida no es válida.');

        if (typeof settings.contactEmail === 'string') {
            contactAddress = settings.contactEmail;
            emailLink.textContent = contactAddress || 'Pendiente de configurar';
            if (contactAddress) emailLink.href = `mailto:${contactAddress}`;
            else emailLink.removeAttribute('href');
        }
        if (typeof settings.contactPhone === 'string') {
            phoneLink.textContent = settings.contactPhone || 'Pendiente de configurar';
            if (settings.contactPhone) {
                phoneLink.href = `tel:${settings.contactPhone.replace(/[^\d+]/g, '')}`;
            } else {
                phoneLink.removeAttribute('href');
            }
        }
        if (typeof settings.openingHours === 'string') {
            document.getElementById('opening-hours').textContent =
                settings.openingHours || 'Pendiente de configurar';
        }
        if (typeof settings.donationUrl === 'string' && isHttpsUrl(settings.donationUrl)) {
            donationLink.href = settings.donationUrl;
            donationLink.target = '_blank';
            donationLink.rel = 'noopener noreferrer';
            donationLink.removeAttribute('data-pet');
            donationLink.textContent = 'Quiero donar';
        }
    } catch (error) {
        showFormStatus(`No se pudo cargar la información actualizada del refugio: ${error.message}`, false);
    }
}

loadPublicSettings();

function showFormStatus(message, success) {
    formStatus.textContent = message;
    const state = success === null ? 'info' : success ? 'exito' : 'error';
    formStatus.className = `estado-formulario ${state}`;
    formStatus.hidden = false;
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = Object.fromEntries(new FormData(form).entries());
    const isAnimalInquiry = [...petGrid.querySelectorAll('.pet')]
        .some(card => card.dataset.name === values.mascota);
    const payload = {
        name: values.nombre,
        email: values.email,
        interest: values.mascota,
        message: values.mensaje,
        consent: values.consentimiento === 'on'
    };

    if (window.PatitasApi.isConfigured()) {
        try {
            const path = isAnimalInquiry ? '/adoption-requests' : '/contact-messages';
            await window.PatitasApi.request(path, { method: 'POST', body: payload });
            showFormStatus('¡Gracias! El refugio recibió tu mensaje y se pondrá en contacto contigo.', true);
            form.reset();
        } catch (error) {
            showFormStatus(`No se pudo enviar el mensaje: ${error.message}`, false);
        }
        return;
    }

    const address = contactAddress;
    if (!address) {
        showFormStatus('El refugio aún no ha configurado un correo de contacto. Inténtalo más tarde.', false);
        return;
    }

    const body = `Nombre: ${payload.name}\nCorreo: ${payload.email}\nMe interesa: ${payload.interest}\n\n${payload.message}`;
    const subject = encodeURIComponent(`Contacto desde la web de Patitas: ${payload.interest}`);
    const mailto = `mailto:${encodeURIComponent(address)}?subject=${subject}&body=${encodeURIComponent(body)}`;
    showFormStatus('Se abrirá tu aplicación de correo. El mensaje solo se enviará cuando confirmes el envío allí.', null);
    window.location.href = mailto;
});
