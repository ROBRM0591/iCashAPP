// Configuración
// Reemplaza esta URL con la URL real de tu API
const apiUrl = 'https://tu-api.com/icash/api';
const itemsPerPage = 10;
let editingId = null;
let currentFormType = null;
let currentPages = {
    'tipos-movimiento': 1,
    'tipos-costo': 1,
    'categorias': 1,
    'conceptos': 1
};
let totalItems = {
    'tipos-movimiento': 0,
    'tipos-costo': 0,
    'categorias': 0,
    'conceptos': 0
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Función de inicialización principal
function initializeApp() {
    // Configurar manejadores de eventos
    setupEventHandlers();
    
    // Cargar datos iniciales
    loadInitialData();
    
    // Configurar ayuda accesibilidad
    setupAccessibility();
}

// Configurar manejadores de eventos
function setupEventHandlers() {
    // Manejar clic en botones "Agregar"
    document.querySelectorAll('.add-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            showForm(targetId);
        });
    });

    // Manejar clic en botones "Cancelar"
    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', function() {
            hideForm(this.closest('.data-form'));
        });
    });

    // Manejar envío de formularios
    document.querySelectorAll('.data-form').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });

    // Manejar búsqueda global
    const toggleSearch = document.getElementById('toggle-search');
    const globalSearch = document.getElementById('global-search');
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');
    
    if (toggleSearch && globalSearch) {
        toggleSearch.addEventListener('click', function() {
            const isHidden = globalSearch.getAttribute('aria-hidden') === 'true';
            globalSearch.setAttribute('aria-hidden', !isHidden);
            
            if (!isHidden) {
                searchInput.value = '';
                performGlobalSearch('');
            } else {
                setTimeout(() => searchInput.focus(), 100);
            }
        });
    }
    
    if (searchInput) {
        // Buscar mientras se escribe (con debounce)
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performGlobalSearch(this.value.trim());
            }, 300);
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', function() {
            searchInput.value = '';
            performGlobalSearch('');
            searchInput.focus();
        });
    }

    // Manejar modal de ayuda
    const toggleHelp = document.getElementById('toggle-help');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    
    if (toggleHelp && helpModal) {
        toggleHelp.addEventListener('click', function() {
            helpModal.setAttribute('aria-hidden', 'false');
        });
    }
    
    if (closeHelp && helpModal) {
        closeHelp.addEventListener('click', function() {
            helpModal.setAttribute('aria-hidden', 'true');
        });
    }
    
    // Cerrar modal al hacer clic fuera
    if (helpModal) {
        helpModal.addEventListener('click', function(e) {
            if (e.target === helpModal) {
                helpModal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // Manejar cambios en selects dependientes
    const tipoMovimientoCat = document.getElementById('id-tipo-movimiento-fk-cat');
    const tipoCostoCat = document.getElementById('id-tipo-costo-fk-cat');
    
    if (tipoMovimientoCat && tipoCostoCat) {
        tipoMovimientoCat.addEventListener('change', function() {
            if (this.value) {
                loadTipoCostoOptions(this.value, tipoCostoCat);
                tipoCostoCat.disabled = false;
            } else {
                tipoCostoCat.innerHTML = '<option value="">Primero seleccione un tipo de movimiento</option>';
                tipoCostoCat.disabled = true;
            }
        });
    }

    const tipoMovimientoCon = document.getElementById('id-tipo-movimiento-fk-con');
    const tipoCostoCon = document.getElementById('id-tipo-costo-fk-con');
    const categoriaCon = document.getElementById('id-categoria-fk-con');
    
    if (tipoMovimientoCon && tipoCostoCon && categoriaCon) {
        tipoMovimientoCon.addEventListener('change', function() {
            if (this.value) {
                loadTipoCostoOptions(this.value, tipoCostoCon);
                tipoCostoCon.disabled = false;
                categoriaCon.disabled = true;
                categoriaCon.innerHTML = '<option value="">Primero seleccione un tipo de costo</option>';
            } else {
                tipoCostoCon.innerHTML = '<option value="">Primero seleccione un tipo de movimiento</option>';
                tipoCostoCon.disabled = true;
                categoriaCon.innerHTML = '<option value="">Primero seleccione un tipo de costo</option>';
                categoriaCon.disabled = true;
            }
        });

        tipoCostoCon.addEventListener('change', function() {
            if (this.value) {
                loadCategoriaOptions(this.value, categoriaCon);
                categoriaCon.disabled = false;
            } else {
                categoriaCon.innerHTML = '<option value="">Primero seleccione un tipo de costo</option>';
                categoriaCon.disabled = true;
            }
        });
    }
}

// Configurar accesibilidad
function setupAccessibility() {
    // Mejorar navegación por teclado
    document.addEventListener('keydown', function(e) {
        // Cerrar modal con ESC
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal[aria-hidden="false"]');
            modals.forEach(modal => {
                modal.setAttribute('aria-hidden', 'true');
            });
            
            // Cerrar formularios abiertos con ESC
            const openForms = document.querySelectorAll('.data-form.active');
            if (openForms.length > 0 && !e.target.matches('input, select, textarea')) {
                hideForm(openForms[0]);
            }
        }
    });
}

// Cargar datos iniciales
async function loadInitialData() {
    showLoading();
    
    try {
        await Promise.all([
            loadSelectOptions(),
            fetchTiposMovimiento(),
            fetchTiposCosto(),
            fetchCategorias(),
            fetchConceptos()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showNotification('Error al cargar los datos iniciales', false);
    } finally {
        hideLoading();
    }
}

// Mostrar/ocultar loading
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.setAttribute('aria-hidden', 'false');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.setAttribute('aria-hidden', 'true');
    }
}

// Mostrar formulario
function showForm(formId) {
    const targetForm = document.getElementById(formId);
    
    if (!targetForm) return;
    
    editingId = null;
    currentFormType = formId;
    
    // Ocultar todos los formularios primero
    document.querySelectorAll('.data-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // Mostrar el formulario seleccionado
    targetForm.reset();
    const idField = targetForm.querySelector('input[type="text"][readonly]');
    if (idField) idField.value = '';
    targetForm.classList.add('active');
    
    // Cargar opciones en los selects si es necesario
    if (formId !== 'tipos-movimiento-form') {
        loadSelectOptions();
    }
    
    // Enfocar el primer campo editable
    const firstInput = targetForm.querySelector('input:not([readonly]), select');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

// Ocultar formulario
function hideForm(form) {
    if (!form) return;
    
    form.reset();
    form.classList.remove('active');
    editingId = null;
    currentFormType = null;
}

// Manejar envío de formularios
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    let action = '';
    let entityType = '';
    
    // Validar formulario
    if (!validateForm(form)) {
        showNotification('Por favor, complete todos los campos requeridos correctamente', false);
        return;
    }
    
    // Determinar acción según el tipo de formulario
    if (form.id.includes('movimiento')) {
        action = editingId ? 'updateTipoMovimiento' : 'createTipoMovimiento';
        entityType = 'TipoMovimiento';
        if (editingId) formData.append('id', editingId);
    } else if (form.id.includes('costo')) {
        action = editingId ? 'updateTipoCosto' : 'createTipoCosto';
        entityType = 'TipoCosto';
        if (editingId) formData.append('id', editingId);
    } else if (form.id.includes('categoria')) {
        action = editingId ? 'updateCategoria' : 'createCategoria';
        entityType = 'Categoria';
        if (editingId) formData.append('id', editingId);
    } else if (form.id.includes('concepto')) {
        action = editingId ? 'updateConcepto' : 'createConcepto';
        entityType = 'Concepto';
        if (editingId) formData.append('id', editingId);
    }
    
    showLoading();
    
    try {
        // Preparar datos para enviar
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Realizar llamada a la API
        const result = await apiCall(action, data);
        
        if (result.success) {
            showNotification(result.message || 'Datos guardados correctamente', true);
            hideForm(form);
            
            // Recargar datos
            if (entityType === 'TipoMovimiento') await fetchTiposMovimiento();
            else if (entityType === 'TipoCosto') await fetchTiposCosto();
            else if (entityType === 'Categoria') await fetchCategorias();
            else if (entityType === 'Concepto') await fetchConceptos();
            
            // Si era un tipo de movimiento, recargar opciones en selects
            if (entityType === 'TipoMovimiento') {
                await loadSelectOptions();
            }
        } else {
            showNotification(result.message || 'Error al guardar los datos', false);
        }
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error al guardar los datos', false);
    } finally {
        hideLoading();
    }
}

// Validar formulario
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            
            // Remover clase de error después de un tiempo
            setTimeout(() => {
                field.classList.remove('error');
            }, 3000);
        } else {
            field.classList.remove('error');
        }
    });
    
    return isValid;
}

// Función para mostrar notificación
function showNotification(message, isSuccess = true) {
    // Crear elemento de notificación si no existe
    let notification = document.getElementById('crud-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'crud-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s, transform 0.3s;
        `;
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.backgroundColor = isSuccess ? '#27ae60' : '#e74c3c';
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';

    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
    }, 3000);
}

// Función genérica para llamadas a la API
async function apiCall(action, data = {}) {
    try {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...data })
        };
        
        const response = await fetch(apiUrl, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Cargar opciones en selects
async function loadSelectOptions() {
    try {
        // Cargar tipos de movimiento para los selects
        const response = await apiCall('getTiposMovimiento');
        
        if (response.success) {
            const selects = document.querySelectorAll('select[name="id_tipo_movimiento"], select[id$="movimiento-fk"]');
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Seleccione un tipo de movimiento</option>';
                response.data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.nombre;
                    select.appendChild(option);
                });
                if (currentValue) select.value = currentValue;
            });
        }
    } catch (error) {
        console.error('Error loading select options:', error);
        showNotification('Error al cargar las opciones', false);
    }
}

// Cargar opciones de tipos de costo basados en tipo de movimiento
async function loadTipoCostoOptions(tipoMovimientoId, selectElement) {
    try {
        const response = await apiCall('getTiposCostoByMovimiento', { id_tipo_movimiento: tipoMovimientoId });
        
        if (response.success) {
            const currentValue = selectElement.value;
            selectElement.innerHTML = '<option value="">Seleccione un tipo de costo</option>';
            response.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.nombre;
                selectElement.appendChild(option);
            });
            if (currentValue) selectElement.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading tipo costo options:', error);
    }
}

// Cargar opciones de categorías basados en tipo de costo
async function loadCategoriaOptions(tipoCostoId, selectElement) {
    try {
        const response = await apiCall('getCategoriasByTipoCosto', { id_tipo_costo: tipoCostoId });
        
        if (response.success) {
            const currentValue = selectElement.value;
            selectElement.innerHTML = '<option value="">Seleccione una categoría</option>';
            response.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.nombre;
                selectElement.appendChild(option);
            });
            if (currentValue) selectElement.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading categoria options:', error);
    }
}

// Fetch and render Tipos de Movimiento
async function fetchTiposMovimiento(page = 1) {
    try {
        const response = await apiCall('getTiposMovimiento', { page, limit: itemsPerPage });
        const tableBody = document.getElementById('tipos-movimiento-body');
        const tableInfo = document.getElementById('tipos-movimiento-info');
        const pagination = document.getElementById('tipos-movimiento-pagination');
        
        tableBody.innerHTML = '';

        if (response.success && response.data && response.data.length > 0) {
            response.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.nombre}</td>
                    <td>
                        <div class="actions">
                            <button class="btn-action edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-action delete-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Actualizar información de la tabla
            if (tableInfo) {
                const total = response.total || response.data.length;
                const start = ((page - 1) * itemsPerPage) + 1;
                const end = Math.min(start + itemsPerPage - 1, total);
                tableInfo.textContent = `Mostrando ${start}-${end} de ${total} registro(s)`;
            }
            
            // Configurar paginación
            setupPagination('tipos-movimiento', page, response.total || response.data.length, pagination);
            
            // Configurar handlers de edición y eliminación
            setupEditHandler(tableBody, 'TipoMovimiento');
            setupDeleteHandler(tableBody, 'TipoMovimiento');
            
        } else {
            tableBody.innerHTML = `<tr><td colspan="3" class="empty-message">No hay tipos de movimiento registrados</td></tr>`;
            if (tableInfo) tableInfo.textContent = 'Mostrando 0 registro(s)';
            if (pagination) pagination.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching tipos de movimiento:', error);
        const tableBody = document.getElementById('tipos-movimiento-body');
        tableBody.innerHTML = `<tr><td colspan="3" class="empty-message">Error al cargar los datos</td></tr>`;
    }
}

// Configurar manejador de edición
function setupEditHandler(tableBody, entityType) {
    tableBody.addEventListener('click', function(e) {
        if (e.target.closest('.edit-btn')) {
            const button = e.target.closest('.edit-btn');
            const id = button.getAttribute('data-id');
            
            // Determinar qué formulario mostrar según el tipo de entidad
            let formId, loadFunction;
            
            switch(entityType) {
                case 'TipoMovimiento':
                    formId = 'tipos-movimiento-form';
                    loadFunction = loadTipoMovimientoForEdit;
                    break;
                case 'TipoCosto':
                    formId = 'tipos-costo-form';
                    loadFunction = loadTipoCostoForEdit;
                    break;
                case 'Categoria':
                    formId = 'categorias-form';
                    loadFunction = loadCategoriaForEdit;
                    break;
                case 'Concepto':
                    formId = 'conceptos-form';
                    loadFunction = loadConceptoForEdit;
                    break;
                default:
                    return;
            }
            
            // Cargar datos para edición
            loadFunction(id, formId);
        }
    });
}

// Cargar datos de Tipo de Movimiento para edición
async function loadTipoMovimientoForEdit(id, formId) {
    try {
        const response = await apiCall('getTipoMovimiento', { id });
        
        if (response.success) {
            const form = document.getElementById(formId);
            const idField = form.querySelector('#id-tipo-movimiento');
            const nombreField = form.querySelector('#tipo-movimiento');
            
            // Llenar formulario con datos
            idField.value = response.data.id;
            nombreField.value = response.data.nombre;
            
            // Establecer modo edición
            editingId = id;
            currentFormType = formId;
            
            // Mostrar formulario
            form.classList.add('active');
        } else {
            showNotification('Error al cargar los datos para edición', false);
        }
    } catch (error) {
        console.error('Error loading data for edit:', error);
        showNotification('Error al cargar los datos para edición', false);
    }
}

// Configurar manejador de eliminación
function setupDeleteHandler(tableBody, entityType) {
    tableBody.addEventListener('click', async function(e) {
        if (e.target.closest('.delete-btn')) {
            const button = e.target.closest('.delete-btn');
            const id = button.getAttribute('data-id');
            
            if (confirm(`¿Está seguro de que desea eliminar este ${entityType}?`)) {
                try {
                    let action;
                    switch(entityType) {
                        case 'TipoMovimiento':
                            action = 'deleteTipoMovimiento';
                            break;
                        case 'TipoCosto':
                            action = 'deleteTipoCosto';
                            break;
                        case 'Categoria':
                            action = 'deleteCategoria';
                            break;
                        case 'Concepto':
                            action = 'deleteConcepto';
                            break;
                        default:
                            return;
                    }
                    
                    const result = await apiCall(action, { id });
                    
                    if (result.success) {
                        showNotification(result.message, true);
                        // Recargar datos
                        if (entityType === 'TipoMovimiento') await fetchTiposMovimiento(currentPages['tipos-movimiento']);
                        else if (entityType === 'TipoCosto') await fetchTiposCosto(currentPages['tipos-costo']);
                        else if (entityType === 'Categoria') await fetchCategorias(currentPages['categorias']);
                        else if (entityType === 'Concepto') await fetchConceptos(currentPages['conceptos']);
                    } else {
                        showNotification(result.message, false);
                    }
                } catch (error) {
                    console.error('Error deleting data:', error);
                    showNotification('Error al eliminar los datos', false);
                }
            }
        }
    });
}

// Configurar paginación
function setupPagination(entityType, currentPage, totalItems, paginationElement) {
    if (!paginationElement) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const prevButton = paginationElement.querySelector('.prev');
    const nextButton = paginationElement.querySelector('.next');
    const statusElement = paginationElement.querySelector('.pagination-status');
    
    // Actualizar estado
    statusElement.textContent = `${currentPage} de ${totalPages}`;
    
    // Habilitar/deshabilitar botones
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
    
    // Configurar event listeners
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPages[entityType] = currentPage - 1;
            if (entityType === 'tipos-movimiento') fetchTiposMovimiento(currentPages[entityType]);
            else if (entityType === 'tipos-costo') fetchTiposCosto(currentPages[entityType]);
            else if (entityType === 'categorias') fetchCategorias(currentPages[entityType]);
            else if (entityType === 'conceptos') fetchConceptos(currentPages[entityType]);
        }
    };
    
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPages[entityType] = currentPage + 1;
            if (entityType === 'tipos-movimiento') fetchTiposMovimiento(currentPages[entityType]);
            else if (entityType === 'tipos-costo') fetchTiposCosto(currentPages[entityType]);
            else if (entityType === 'categorias') fetchCategorias(currentPages[entityType]);
            else if (entityType === 'conceptos') fetchConceptos(currentPages[entityType]);
        }
    };
    
    paginationElement.style.display = totalPages > 1 ? 'flex' : 'none';
}

// Fetch and render Tipos de Costo
async function fetchTiposCosto(page = 1) {
    try {
        const response = await apiCall('getTiposCosto', { page, limit: itemsPerPage });
        const tableBody = document.getElementById('tipos-costo-body');
        const tableInfo = document.getElementById('tipos-costo-info');
        const pagination = document.getElementById('tipos-costo-pagination');
        
        tableBody.innerHTML = '';

        if (response.success && response.data && response.data.length > 0) {
            response.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.nombre}</td>
                    <td>${item.tipo_movimiento || ''}</td>
                    <td>
                        <div class="actions">
                            <button class="btn-action edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-action delete-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Actualizar información de la tabla
            if (tableInfo) {
                const total = response.total || response.data.length;
                const start = ((page - 1) * itemsPerPage) + 1;
                const end = Math.min(start + itemsPerPage - 1, total);
                tableInfo.textContent = `Mostrando ${start}-${end} de ${total} registro(s)`;
            }
            
            // Configurar paginación
            setupPagination('tipos-costo', page, response.total || response.data.length, pagination);
            
            // Configurar handlers de edición y eliminación
            setupEditHandler(tableBody, 'TipoCosto');
            setupDeleteHandler(tableBody, 'TipoCosto');
            
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" class="empty-message">No hay tipos de costo registrados</td></tr>`;
            if (tableInfo) tableInfo.textContent = 'Mostrando 0 registro(s)';
            if (pagination) pagination.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching tipos de costo:', error);
        const tableBody = document.getElementById('tipos-costo-body');
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-message">Error al cargar los datos</td></tr>`;
    }
}

// Cargar datos de Tipo de Costo para edición
async function loadTipoCostoForEdit(id, formId) {
    try {
        const response = await apiCall('getTipoCosto', { id });
        
        if (response.success) {
            const form = document.getElementById(formId);
            const idField = form.querySelector('#id-tipo-costo');
            const nombreField = form.querySelector('#tipo-costo');
            const tipoMovimientoField = form.querySelector('#id-tipo-movimiento-fk');
            
            // Llenar formulario con datos
            idField.value = response.data.id;
            nombreField.value = response.data.nombre;
            
            // Cargar opciones de tipo de movimiento si es necesario
            if (tipoMovimientoField.options.length <= 1) {
                await loadSelectOptions();
            }
            
            // Establecer valor del tipo de movimiento
            if (response.data.id_tipo_movimiento) {
                tipoMovimientoField.value = response.data.id_tipo_movimiento;
            }
            
            // Establecer modo edición
            editingId = id;
            currentFormType = formId;
            
            // Mostrar formulario
            form.classList.add('active');
        } else {
            showNotification('Error al cargar los datos para edición', false);
        }
    } catch (error) {
        console.error('Error loading data for edit:', error);
        showNotification('Error al cargar los datos para edición', false);
    }
}

// Fetch and render Categorías
async function fetchCategorias(page = 1) {
    try {
        const response = await apiCall('getCategorias', { page, limit: itemsPerPage });
        const tableBody = document.getElementById('categorias-body');
        const tableInfo = document.getElementById('categorias-info');
        const pagination = document.getElementById('categorias-pagination');
        
        tableBody.innerHTML = '';

        if (response.success && response.data && response.data.length > 0) {
            response.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.nombre}</td>
                    <td>${item.tipo_movimiento || ''}</td>
                    <td>${item.tipo_costo || ''}</td>
                    <td>
                        <div class="actions">
                            <button class="btn-action edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-action delete-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Actualizar información de la tabla
            if (tableInfo) {
                const total = response.total || response.data.length;
                const start = ((page - 1) * itemsPerPage) + 1;
                const end = Math.min(start + itemsPerPage - 1, total);
                tableInfo.textContent = `Mostrando ${start}-${end} de ${total} registro(s)`;
            }
            
            // Configurar paginación
            setupPagination('categorias', page, response.total || response.data.length, pagination);
            
            // Configurar handlers de edición y eliminación
            setupEditHandler(tableBody, 'Categoria');
            setupDeleteHandler(tableBody, 'Categoria');
            
        } else {
            tableBody.innerHTML = `<tr><td colspan="5" class="empty-message">No hay categorías registradas</td></tr>`;
            if (tableInfo) tableInfo.textContent = 'Mostrando 0 registro(s)';
            if (pagination) pagination.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching categorías:', error);
        const tableBody = document.getElementById('categorias-body');
        tableBody.innerHTML = `<tr><td colspan="5" class="empty-message">Error al cargar los datos</td></tr>`;
    }
}

// Cargar datos de Categoría para edición
async function loadCategoriaForEdit(id, formId) {
    try {
        const response = await apiCall('getCategoria', { id });
        
        if (response.success) {
            const form = document.getElementById(formId);
            const idField = form.querySelector('#id-categoria');
            const nombreField = form.querySelector('#categoria');
            const tipoMovimientoField = form.querySelector('#id-tipo-movimiento-fk-cat');
            const tipoCostoField = form.querySelector('#id-tipo-costo-fk-cat');
            
            // Llenar formulario con datos
            idField.value = response.data.id;
            nombreField.value = response.data.nombre;
            
            // Cargar opciones de tipo de movimiento si es necesario
            if (tipoMovimientoField.options.length <= 1) {
                await loadSelectOptions();
            }
            
            // Establecer valor del tipo de movimiento
            if (response.data.id_tipo_movimiento) {
                tipoMovimientoField.value = response.data.id_tipo_movimiento;
                
                // Cargar tipos de costo basados en el tipo de movimiento
                await loadTipoCostoOptions(response.data.id_tipo_movimiento, tipoCostoField);
                tipoCostoField.disabled = false;
                
                // Establecer valor del tipo de costo
                if (response.data.id_tipo_costo) {
                    tipoCostoField.value = response.data.id_tipo_costo;
                }
            }
            
            // Establecer modo edición
            editingId = id;
            currentFormType = formId;
            
            // Mostrar formulario
            form.classList.add('active');
        } else {
            showNotification('Error al cargar los datos para edición', false);
        }
    } catch (error) {
        console.error('Error loading data for edit:', error);
        showNotification('Error al cargar los datos para edición', false);
    }
}

// Fetch and render Conceptos
async function fetchConceptos(page = 1) {
    try {
        const response = await apiCall('getConceptos', { page, limit: itemsPerPage });
        const tableBody = document.getElementById('conceptos-body');
        const tableInfo = document.getElementById('conceptos-info');
        const pagination = document.getElementById('conceptos-pagination');
        
        tableBody.innerHTML = '';

        if (response.success && response.data && response.data.length > 0) {
            response.data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.nombre}</td>
                    <td>${item.categoria || ''}</td>
                    <td>${item.tipo_movimiento || ''}</td>
                    <td>${item.tipo_costo || ''}</td>
                    <td>
                        <div class="actions">
                            <button class="btn-action edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-action delete-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Actualizar información de la tabla
            if (tableInfo) {
                const total = response.total || response.data.length;
                const start = ((page - 1) * itemsPerPage) + 1;
                const end = Math.min(start + itemsPerPage - 1, total);
                tableInfo.textContent = `Mostrando ${start}-${end} de ${total} registro(s)`;
            }
            
            // Configurar paginación
            setupPagination('conceptos', page, response.total || response.data.length, pagination);
            
            // Configurar handlers de edición y eliminación
            setupEditHandler(tableBody, 'Concepto');
            setupDeleteHandler(tableBody, 'Concepto');
            
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" class="empty-message">No hay conceptos registrados</td></tr>`;
            if (tableInfo) tableInfo.textContent = 'Mostrando 0 registro(s)';
            if (pagination) pagination.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching conceptos:', error);
        const tableBody = document.getElementById('conceptos-body');
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-message">Error al cargar los datos</td></tr>`;
    }
}

// Cargar datos de Concepto para edición
async function loadConceptoForEdit(id, formId) {
    try {
        const response = await apiCall('getConcepto', { id });
        
        if (response.success) {
            const form = document.getElementById(formId);
            const idField = form.querySelector('#id-concepto');
            const nombreField = form.querySelector('#concepto');
            const tipoMovimientoField = form.querySelector('#id-tipo-movimiento-fk-con');
            const tipoCostoField = form.querySelector('#id-tipo-costo-fk-con');
            const categoriaField = form.querySelector('#id-categoria-fk-con');
            
            // Llenar formulario con datos
            idField.value = response.data.id;
            nombreField.value = response.data.nombre;
            
            // Cargar opciones de tipo de movimiento si es necesario
            if (tipoMovimientoField.options.length <= 1) {
                await loadSelectOptions();
            }
            
            // Establecer valor del tipo de movimiento
            if (response.data.id_tipo_movimiento) {
                tipoMovimientoField.value = response.data.id_tipo_movimiento;
                
                // Cargar tipos de costo basados en el tipo de movimiento
                await loadTipoCostoOptions(response.data.id_tipo_movimiento, tipoCostoField);
                tipoCostoField.disabled = false;
                
                // Establecer valor del tipo de costo
                if (response.data.id_tipo_costo) {
                    tipoCostoField.value = response.data.id_tipo_costo;
                    
                    // Cargar categorías basadas en el tipo de costo
                    await loadCategoriaOptions(response.data.id_tipo_costo, categoriaField);
                    categoriaField.disabled = false;
                    
                    // Establecer valor de la categoría
                    if (response.data.id_categoria) {
                        categoriaField.value = response.data.id_categoria;
                    }
                }
            }
            
            // Establecer modo edición
            editingId = id;
            currentFormType = formId;
            
            // Mostrar formulario
            form.classList.add('active');
        } else {
            showNotification('Error al cargar los datos para edición', false);
        }
    } catch (error) {
        console.error('Error loading data for edit:', error);
        showNotification('Error al cargar los datos para edición', false);
    }
}

// Implementación de búsqueda global
async function performGlobalSearch(query) {
    if (!query) {
        // Si la búsqueda está vacía, recargar todos los datos normales
        await fetchTiposMovimiento(currentPages['tipos-movimiento']);
        await fetchTiposCosto(currentPages['tipos-costo']);
        await fetchCategorias(currentPages['categorias']);
        await fetchConceptos(currentPages['conceptos']);
        return;
    }
    
    showLoading();
    
    try {
        // Buscar en todos los catálogos
        const responses = await Promise.all([
            apiCall('searchTiposMovimiento', { q: query }),
            apiCall('searchTiposCosto', { q: query }),
            apiCall('searchCategorias', { q: query }),
            apiCall('searchConceptos', { q: query })
        ]);
        
        // Actualizar cada tabla con los resultados
        if (responses[0].success) updateTable('tipos-movimiento', responses[0].data);
        if (responses[1].success) updateTable('tipos-costo', responses[1].data);
        if (responses[2].success) updateTable('categorias', responses[2].data);
        if (responses[3].success) updateTable('conceptos', responses[3].data);
        
    } catch (error) {
        console.error('Error performing search:', error);
        showNotification('Error al realizar la búsqueda', false);
    } finally {
        hideLoading();
    }
}

// Actualizar tabla con datos de búsqueda
function updateTable(tableType, data) {
    const tableBody = document.getElementById(`${tableType}-body`);
    const tableInfo = document.getElementById(`${tableType}-info`);
    const pagination = document.getElementById(`${tableType}-pagination`);
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (data && data.length > 0) {
        // Determinar las columnas según el tipo de tabla
        let columns = [];
        switch(tableType) {
            case 'tipos-movimiento':
                columns = ['id', 'nombre'];
                break;
            case 'tipos-costo':
                columns = ['id', 'nombre', 'tipo_movimiento'];
                break;
            case 'categorias':
                columns = ['id', 'nombre', 'tipo_movimiento', 'tipo_costo'];
                break;
            case 'conceptos':
                columns = ['id', 'nombre', 'categoria', 'tipo_movimiento', 'tipo_costo'];
                break;
        }
        
        data.forEach(item => {
            const row = document.createElement('tr');
            let rowContent = '';
            
            // Agregar las columnas correspondientes
            columns.forEach(col => {
                rowContent += `<td>${item[col] || ''}</td>`;
            });
            
            // Agregar acciones
            rowContent += `
                <td>
                    <div class="actions">
                        <button class="btn-action edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn-action delete-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            `;
            
            row.innerHTML = rowContent;
            tableBody.appendChild(row);
        });
        
        // Configurar handlers de edición y eliminación
        const entityType = tableType === 'tipos-movimiento' ? 'TipoMovimiento' :
                          tableType === 'tipos-costo' ? 'TipoCosto' :
                          tableType === 'categorias' ? 'Categoria' : 'Concepto';
        
        setupEditHandler(tableBody, entityType);
        setupDeleteHandler(tableBody, entityType);
        
        // Actualizar información de la tabla
        if (tableInfo) {
            tableInfo.textContent = `Mostrando ${data.length} resultado(s) de búsqueda`;
        }
    } else {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-message">No se encontraron resultados</td></tr>`;
        if (tableInfo) tableInfo.textContent = 'Mostrando 0 resultado(s)';
    }
    
    // Ocultar paginación durante la búsqueda
    if (pagination) {
        pagination.style.display = 'none';
    }
}