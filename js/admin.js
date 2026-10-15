const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const adminStatus = document.getElementById('admin-status');
const logoutButton = document.getElementById('logout');
const animalForm = document.getElementById('animal-form');
const cancelEdit = document.getElementById('cancel-edit');
const postForm = document.getElementById('post-form');
const cancelPostEdit = document.getElementById('cancel-post-edit');
const views = [...document.querySelectorAll('.admin-view')];
const navigationButtons = [...document.querySelectorAll('.admin-nav [data-view]')];

const adminData = {
    animals: null,
    adoptions: null,
    messages: null,
    donations: null,
    posts: null,
    settings: null
};

function showAdminStatus(message, type = 'info') {
    adminStatus.textContent = message;
    adminStatus.className = `estado-formulario ${type}`;
    adminStatus.hidden = !message;
}

function showPanel(session) {
    if (!session || !session.user) throw new Error('La sesión no contiene un usuario válido.');
    loginForm.hidden = true;
    adminPanel.hidden = false;
    logoutButton.hidden = false;
    document.getElementById('admin-user').textContent = session.user.email || 'Sesión de administración';
}

function showView(viewName) {
    views.forEach(view => {
        view.hidden = view.dataset.panel !== viewName;
    });
    navigationButtons.forEach(button => {
        const selected = button.dataset.view === viewName;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
}

function makeCell(value) {
    const cell = document.createElement('td');
    cell.textContent = value == null ? '' : String(value);
    return cell;
}

function showEmpty(container, message) {
    container.textContent = message;
    container.classList.add('admin-empty');
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es');
}

function formatMoney(value, currency) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || !currency) return '—';
    try {
        return new Intl.NumberFormat('es', { style: 'currency', currency }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

function addTable(container, headers, rows) {
    container.replaceChildren();
    container.classList.remove('admin-empty');
    if (!rows.length) {
        showEmpty(container, 'No hay registros para mostrar.');
        return null;
    }

    const table = document.createElement('table');
    const head = document.createElement('tr');
    headers.forEach(label => {
        const cell = document.createElement('th');
        cell.scope = 'col';
        cell.textContent = label;
        head.append(cell);
    });
    const tableHead = document.createElement('thead');
    tableHead.append(head);
    const body = document.createElement('tbody');
    table.append(tableHead, body);
    container.append(table);
    return body;
}

function createStatusSelect(record, route, label) {
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Estado ${label}`);
    const states = [
        ['new', 'Nueva'],
        ['in_review', 'En revisión'],
        ['contacted', 'Contactada'],
        ['closed', 'Cerrada']
    ];
    states.forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.add(option);
    });
    if (!states.some(([value]) => value === record.status)) {
        const current = document.createElement('option');
        current.value = record.status;
        current.textContent = record.status || 'Sin estado';
        select.add(current);
    }
    select.value = record.status;
    select.addEventListener('change', async () => {
        select.disabled = true;
        try {
            await window.PatitasApi.request(`${route}/${encodeURIComponent(record.id)}`, {
                method: 'PATCH',
                body: { status: select.value }
            });
            record.status = select.value;
            showAdminStatus('Estado actualizado correctamente.', 'exito');
            renderDashboard();
        } catch (error) {
            select.value = record.status;
            showAdminStatus(`No se pudo actualizar el estado: ${error.message}`, 'error');
        } finally {
            select.disabled = false;
        }
    });
    return select;
}

function renderAnimals() {
    const container = document.getElementById('animal-list');
    if (!adminData.animals) return;
    const body = addTable(container, ['Nombre', 'Especie', 'Estado', 'Acciones'], adminData.animals);
    if (!body) return;

    adminData.animals.forEach(animal => {
        const row = document.createElement('tr');
        row.append(makeCell(animal.name), makeCell(animal.species), makeCell(
            animal.status === 'available' ? 'Disponible' : animal.status === 'adopted' ? 'Adoptado' : animal.status
        ));
        const actions = document.createElement('td');
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn btn-sm btn-secondary';
        edit.textContent = 'Editar';
        edit.addEventListener('click', () => {
            for (const [key, value] of Object.entries(animal)) {
                const field = animalForm.elements.namedItem(key);
                if (field) field.value = value || '';
            }
            document.getElementById('animal-form-heading').textContent = `Editar a ${animal.name}`;
            cancelEdit.hidden = false;
            animalForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-sm';
        toggle.textContent = animal.status === 'available' ? 'Marcar adoptado' : 'Reactivar';
        toggle.addEventListener('click', async () => {
            toggle.disabled = true;
            try {
                const status = animal.status === 'available' ? 'adopted' : 'available';
                const updated = await window.PatitasApi.request(
                    `/admin/animals/${encodeURIComponent(animal.id)}`,
                    { method: 'PATCH', body: { status } }
                );
                animal.status = updated && updated.status ? updated.status : status;
                renderAnimals();
                renderDashboard();
                showAdminStatus('Estado de la mascota actualizado.', 'exito');
            } catch (error) {
                showAdminStatus(`No se pudo actualizar la mascota: ${error.message}`, 'error');
                toggle.disabled = false;
            }
        });
        actions.append(edit, toggle);
        row.append(actions);
        body.append(row);
    });
}

function renderRequestTable(container, records, type) {
    if (!records) return;
    const body = addTable(container, ['Fecha', 'Nombre', 'Correo', 'Interés', 'Mensaje', 'Estado'], records);
    if (!body) return;
    const route = type === 'adoption' ? '/admin/adoption-requests' : '/admin/contact-messages';

    records.forEach(record => {
        const row = document.createElement('tr');
        row.append(makeCell(formatDate(record.created_at)), makeCell(record.name));
        const emailCell = document.createElement('td');
        const email = document.createElement('a');
        email.href = `mailto:${record.email}`;
        email.textContent = record.email || '—';
        emailCell.append(email);
        row.append(emailCell, makeCell(record.interest), makeCell(record.message));
        const statusCell = document.createElement('td');
        statusCell.append(createStatusSelect(record, route, `de ${record.name || 'persona'}`));
        row.append(statusCell);
        body.append(row);
    });
}

function renderDonations() {
    if (!adminData.donations) return;
    const { summary, items } = adminData.donations;
    document.getElementById('donation-total').textContent =
        formatMoney(summary.total_amount, summary.currency);
    document.getElementById('donation-count').textContent = String(summary.count);
    document.getElementById('stat-donations').textContent = String(summary.count);
    document.getElementById('stat-donations-total').textContent =
        formatMoney(summary.total_amount, summary.currency);

    const container = document.getElementById('donation-list');
    const body = addTable(container, ['Fecha', 'Donante', 'Referencia', 'Importe', 'Estado'], items);
    if (!body) return;
    items.forEach(donation => {
        const row = document.createElement('tr');
        row.append(
            makeCell(formatDate(donation.created_at)),
            makeCell(donation.donor_name || 'Donante anónimo'),
            makeCell(donation.reference),
            makeCell(formatMoney(donation.amount, donation.currency)),
            makeCell(donation.status)
        );
        body.append(row);
    });
}

function renderPosts() {
    if (!adminData.posts) return;
    const container = document.getElementById('post-list');
    const body = addTable(container, ['Título', 'Fecha', 'Visibilidad', 'Acciones'], adminData.posts);
    document.getElementById('stat-posts').textContent = String(
        adminData.posts.filter(post => post.status === 'published').length
    );
    document.getElementById('stat-posts-total').textContent = `${adminData.posts.length} publicaciones`;
    if (!body) return;

    adminData.posts.forEach(post => {
        const row = document.createElement('tr');
        row.append(
            makeCell(post.title),
            makeCell(formatDate(post.updated_at || post.created_at)),
            makeCell(post.status === 'published' ? 'Publicado' : 'Borrador')
        );
        const actions = document.createElement('td');
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn btn-sm btn-secondary';
        edit.textContent = 'Editar';
        edit.addEventListener('click', () => {
            for (const [key, value] of Object.entries(post)) {
                const field = postForm.elements.namedItem(key);
                if (field) field.value = value || '';
            }
            document.getElementById('post-form-heading').textContent = `Editar: ${post.title}`;
            cancelPostEdit.hidden = false;
            postForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'btn btn-sm';
        toggle.textContent = post.status === 'published' ? 'Pasar a borrador' : 'Publicar';
        toggle.addEventListener('click', async () => {
            toggle.disabled = true;
            try {
                const status = post.status === 'published' ? 'draft' : 'published';
                const updated = await window.PatitasApi.request(
                    `/admin/posts/${encodeURIComponent(post.id)}`,
                    { method: 'PATCH', body: { status } }
                );
                post.status = updated && updated.status ? updated.status : status;
                renderPosts();
                showAdminStatus('Visibilidad de la publicación actualizada.', 'exito');
            } catch (error) {
                showAdminStatus(`No se pudo cambiar la publicación: ${error.message}`, 'error');
                toggle.disabled = false;
            }
        });
        actions.append(edit, toggle);
        row.append(actions);
        body.append(row);
    });
}

function renderDashboard() {
    if (adminData.animals) {
        const available = adminData.animals.filter(animal => animal.status === 'available').length;
        document.getElementById('stat-animals').textContent = String(available);
        document.getElementById('stat-animals-total').textContent = `${adminData.animals.length} registradas`;
    }
    if (adminData.adoptions) {
        const pending = adminData.adoptions.filter(request => request.status === 'new' || request.status === 'in_review').length;
        document.getElementById('stat-adoptions').textContent = String(pending);
        document.getElementById('stat-adoptions-total').textContent = `${adminData.adoptions.length} solicitudes`;
    }
    if (adminData.messages) {
        const unread = adminData.messages.filter(message => message.status === 'new').length;
        document.getElementById('stat-messages').textContent = String(unread);
        document.getElementById('stat-messages-total').textContent = `${adminData.messages.length} mensajes`;
    }
    if (adminData.donations) {
        document.getElementById('stat-donations').textContent = String(adminData.donations.summary.count);
        document.getElementById('stat-donations-total').textContent = formatMoney(
            adminData.donations.summary.total_amount,
            adminData.donations.summary.currency
        );
    }
    if (adminData.posts) renderPosts();

    const recent = [
        ...(adminData.adoptions || []).map(item => ({ ...item, type: 'Adopción' })),
        ...(adminData.messages || []).map(item => ({ ...item, type: 'Mensaje' }))
    ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 6);
    const container = document.getElementById('recent-activity');
    const body = addTable(container, ['Tipo', 'Fecha', 'Persona', 'Interés', 'Estado'], recent);
    if (body) recent.forEach(item => {
        const row = document.createElement('tr');
        row.append(
            makeCell(item.type),
            makeCell(formatDate(item.created_at)),
            makeCell(item.name),
            makeCell(item.interest),
            makeCell(item.status)
        );
        body.append(row);
    });
}

function showModuleError(containerId, error) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    showEmpty(container, `No se pudo cargar esta información: ${error.message}`);
}

async function loadModule(key) {
    try {
        if (key === 'animals') {
            const result = await window.PatitasApi.request('/admin/animals');
            if (!Array.isArray(result)) throw new Error('La API devolvió una lista de mascotas no válida.');
            adminData.animals = result;
            renderAnimals();
        } else if (key === 'adoptions') {
            const result = await window.PatitasApi.request('/admin/adoption-requests');
            if (!Array.isArray(result)) throw new Error('La API devolvió una lista de solicitudes no válida.');
            adminData.adoptions = result;
            renderRequestTable(document.getElementById('adoption-list'), result, 'adoption');
        } else if (key === 'messages') {
            const result = await window.PatitasApi.request('/admin/contact-messages');
            if (!Array.isArray(result)) throw new Error('La API devolvió una lista de mensajes no válida.');
            adminData.messages = result;
            renderRequestTable(document.getElementById('message-list'), result, 'message');
        } else if (key === 'donations') {
            const result = await window.PatitasApi.request('/admin/donations');
            if (!result || !result.summary || !Array.isArray(result.items)) {
                throw new Error('La API devolvió un historial de donaciones no válido.');
            }
            adminData.donations = result;
            renderDonations();
        } else if (key === 'content') {
            const result = await window.PatitasApi.request('/admin/posts');
            if (!Array.isArray(result)) throw new Error('La API devolvió una lista de publicaciones no válida.');
            adminData.posts = result;
            renderPosts();
        } else if (key === 'settings') {
            const result = await window.PatitasApi.request('/admin/settings');
            if (!result || typeof result !== 'object') throw new Error('La API devolvió una configuración no válida.');
            adminData.settings = result;
            const form = document.getElementById('settings-form');
            Object.entries(result).forEach(([name, value]) => {
                const field = form.elements.namedItem(name);
                if (field) field.value = value || '';
            });
        }
        renderDashboard();
        return null;
    } catch (error) {
        const target = {
            animals: 'animal-list',
            adoptions: 'adoption-list',
            messages: 'message-list',
            donations: 'donation-list',
            content: 'post-list',
            settings: null
        }[key];
        if (target) showModuleError(target, error);
        showAdminStatus(`No se pudo cargar el módulo: ${error.message}`, 'error');
        return error;
    }
}

async function refreshDashboard() {
    showAdminStatus('Actualizando los datos del refugio…');
    const results = await Promise.all([
        loadModule('animals'),
        loadModule('adoptions'),
        loadModule('messages'),
        loadModule('donations'),
        loadModule('content')
    ]);
    const failures = results.filter(Boolean);
    if (failures.length) {
        showAdminStatus(`Dashboard parcialmente actualizado. ${failures.length} módulo(s) no respondieron.`, 'error');
    } else {
        showAdminStatus('Dashboard actualizado.', 'exito');
    }
}

navigationButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const view = button.dataset.view;
        showView(view);
        if (view !== 'dashboard') await loadModule(view);
    });
});

document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', async () => {
        const view = button.dataset.go;
        showView(view);
        if (view === 'animals' && button.dataset.action === 'new-animal') {
            animalForm.reset();
            document.getElementById('animal-form-heading').textContent = 'Registrar mascota';
            cancelEdit.hidden = true;
        }
        if (view !== 'dashboard') await loadModule(view);
    });
});

document.getElementById('refresh-dashboard').addEventListener('click', refreshDashboard);

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!window.PatitasApi.isConfigured()) {
        showAdminStatus('Configura la URL de la API antes de habilitar el acceso de administración.', 'error');
        return;
    }

    const values = Object.fromEntries(new FormData(loginForm).entries());
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
        const session = await window.PatitasApi.request('/admin/session', {
            method: 'POST',
            body: { email: values.email, password: values.password }
        });
        showPanel(session);
        showView('dashboard');
        await refreshDashboard();
    } catch (error) {
        showAdminStatus(`No se pudo iniciar sesión: ${error.message}`, 'error');
    } finally {
        submit.disabled = false;
    }
});

logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
        await window.PatitasApi.request('/admin/session', { method: 'DELETE' });
        adminPanel.hidden = true;
        logoutButton.hidden = true;
        loginForm.hidden = false;
        loginForm.reset();
        Object.keys(adminData).forEach(key => { adminData[key] = null; });
        showAdminStatus('Sesión cerrada.', 'exito');
    } catch (error) {
        showAdminStatus(`No se pudo cerrar la sesión: ${error.message}`, 'error');
    } finally {
        logoutButton.disabled = false;
    }
});

animalForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!animalForm.reportValidity()) return;
    const values = Object.fromEntries(new FormData(animalForm).entries());
    const id = values.id;
    delete values.id;
    const button = animalForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        await window.PatitasApi.request(
            id ? `/admin/animals/${encodeURIComponent(id)}` : '/admin/animals',
            { method: id ? 'PUT' : 'POST', body: values }
        );
        animalForm.reset();
        cancelEdit.hidden = true;
        document.getElementById('animal-form-heading').textContent = 'Registrar mascota';
        await loadModule('animals');
        showAdminStatus('Mascota guardada correctamente.', 'exito');
    } catch (error) {
        showAdminStatus(`No se pudo guardar la mascota: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
    }
});

cancelEdit.addEventListener('click', () => {
    animalForm.reset();
    cancelEdit.hidden = true;
    document.getElementById('animal-form-heading').textContent = 'Registrar mascota';
});

document.getElementById('settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const settings = Object.fromEntries(new FormData(form).entries());
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        adminData.settings = await window.PatitasApi.request('/admin/settings', {
            method: 'PUT',
            body: settings
        });
        showAdminStatus('Datos del sitio guardados correctamente.', 'exito');
    } catch (error) {
        showAdminStatus(`No se pudieron guardar los datos del sitio: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
    }
});

postForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!postForm.reportValidity()) return;
    const values = Object.fromEntries(new FormData(postForm).entries());
    const id = values.id;
    delete values.id;
    const submit = postForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
        await window.PatitasApi.request(
            id ? `/admin/posts/${encodeURIComponent(id)}` : '/admin/posts',
            { method: id ? 'PUT' : 'POST', body: values }
        );
        postForm.reset();
        cancelPostEdit.hidden = true;
        document.getElementById('post-form-heading').textContent = 'Crear publicación';
        await loadModule('content');
        showAdminStatus('Publicación guardada correctamente.', 'exito');
    } catch (error) {
        showAdminStatus(`No se pudo guardar la publicación: ${error.message}`, 'error');
    } finally {
        submit.disabled = false;
    }
});

cancelPostEdit.addEventListener('click', () => {
    postForm.reset();
    cancelPostEdit.hidden = true;
    document.getElementById('post-form-heading').textContent = 'Crear publicación';
});

if (!window.PatitasApi.isConfigured()) {
    showAdminStatus('Dashboard preparado, pero sin conexión: configura la API según INTEGRACION.md.', 'error');
} else {
    window.PatitasApi.request('/admin/session')
        .then(async session => {
            showPanel(session);
            showView('dashboard');
            await refreshDashboard();
        })
        .catch(error => {
            if (error.status !== 401 && error.status !== 403) {
                showAdminStatus(`No se pudo verificar la sesión: ${error.message}`, 'error');
            }
        });
}
