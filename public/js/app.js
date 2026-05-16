document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;
    
    // Check local storage for theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            root.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            updateThemeIcon('light');
        } else {
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            updateThemeIcon('dark');
        }
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        if (theme === 'dark') {
            icon.className = 'ph ph-sun';
            text.textContent = 'Light Mode';
        } else {
            icon.className = 'ph ph-moon';
            text.textContent = 'Dark Mode';
        }
    }

    // --- Tab Navigation ---
    const navLinks = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    window.switchTab = function(tabId) {
        // Remove active class from all tabs and links
        navLinks.forEach(link => link.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to selected
        const selectedLink = document.querySelector(`.nav-links li[data-tab="${tabId}"]`);
        const selectedContent = document.getElementById(tabId);
        
        if (selectedLink && selectedContent) {
            selectedLink.classList.add('active');
            selectedContent.classList.add('active');
        }
        
        // Refresh data based on tab
        if (tabId === 'inventory') {
            loadInventory();
        } else if (tabId === 'recipes') {
            loadRecipes();
        } else if (tabId === 'dashboard') {
            updateDashboard();
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            switchTab(link.getAttribute('data-tab'));
        });
    });

    // --- Inventory Management ---
    const addItemBtn = document.getElementById('add-item-btn');
    const addItemFormContainer = document.getElementById('add-item-form-container');
    const cancelAddBtn = document.getElementById('cancel-add');
    const addItemForm = document.getElementById('add-item-form');
    const inventoryTableBody = document.getElementById('inventory-table-body');

    addItemBtn.addEventListener('click', () => {
        addItemFormContainer.classList.remove('hidden');
    });

    cancelAddBtn.addEventListener('click', () => {
        addItemFormContainer.classList.add('hidden');
        addItemForm.reset();
    });

    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newItem = {
            name: document.getElementById('item-name').value,
            quantity: document.getElementById('item-qty').value,
            category: document.getElementById('item-category').value,
            expiry_date: document.getElementById('item-expiry').value
        };

        try {
            const response = await fetch('/api/inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newItem)
            });

            if (response.ok) {
                addItemFormContainer.classList.add('hidden');
                addItemForm.reset();
                loadInventory();
                updateDashboard();
            } else {
                console.error("Failed to add item");
            }
        } catch (err) {
            console.error(err);
        }
    });

    window.deleteItem = async function(id) {
        if(confirm('Are you sure you want to remove this item?')) {
            try {
                const response = await fetch(`/api/inventory/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    loadInventory();
                    updateDashboard();
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    async function loadInventory() {
        try {
            const response = await fetch('/api/inventory');
            const result = await response.json();
            
            if (result.message === 'success') {
                renderInventory(result.data);
            }
        } catch (err) {
            console.error("Failed to load inventory", err);
        }
    }

    function renderInventory(items) {
        inventoryTableBody.innerHTML = '';
        
        if (items.length === 0) {
            inventoryTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No items in inventory. Add some!</td></tr>';
            return;
        }

        items.forEach(item => {
            const tr = document.createElement('tr');
            
            // Format date
            const expDate = new Date(item.expiry_date);
            const isExpiringSoon = (expDate - new Date()) / (1000 * 60 * 60 * 24) < 7; // Less than 7 days
            const dateStyle = isExpiringSoon ? 'color: #e74c3c; font-weight: 600;' : '';

            // Badge styling
            let badgeClass = 'badge-produce';
            if (item.category === 'Pantry') badgeClass = 'badge-pantry';
            else if (item.category === 'Dairy') badgeClass = 'badge'; // Add more classes in CSS as needed

            tr.innerHTML = `
                <td style="font-weight: 500;">${item.name}</td>
                <td><span class="badge ${badgeClass}">${item.category}</span></td>
                <td>${item.quantity}</td>
                <td style="${dateStyle}">${item.expiry_date}</td>
                <td>
                    <button class="action-btn" onclick="deleteItem(${item.id})">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            inventoryTableBody.appendChild(tr);
        });
    }

    // --- Recipes ---
    const recipesGrid = document.getElementById('recipes-grid');

    async function loadRecipes() {
        try {
            const response = await fetch('/api/recipes');
            const result = await response.json();
            
            if (result.message === 'success') {
                renderRecipes(result.data);
            }
        } catch (err) {
            console.error("Failed to load recipes", err);
        }
    }

    function renderRecipes(recipes) {
        recipesGrid.innerHTML = '';
        
        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            
            // Highlight match score
            let matchHtml = '';
            if (recipe.matchScore > 0) {
                matchHtml = `<div class="match-score"><i class="ph ph-check-circle"></i> ${recipe.matchScore} ingredients match</div>`;
            }

            card.innerHTML = `
                <img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-image">
                <div class="recipe-content">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <p class="recipe-desc">${recipe.description}</p>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                        <strong>Ingredients:</strong> ${recipe.ingredients}
                    </p>
                    <div class="recipe-meta">
                        ${matchHtml}
                        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">View</button>
                    </div>
                </div>
            `;
            recipesGrid.appendChild(card);
        });
    }

    // --- Dashboard ---
    async function updateDashboard() {
        try {
            const [invRes, recRes] = await Promise.all([
                fetch('/api/inventory'),
                fetch('/api/recipes')
            ]);
            
            const invResult = await invRes.json();
            const recResult = await recRes.json();
            
            if (invResult.message === 'success') {
                const items = invResult.data;
                document.getElementById('total-items-stat').textContent = items.length;
                
                // Count expiring soon
                let expiringCount = 0;
                const now = new Date();
                items.forEach(item => {
                    const exp = new Date(item.expiry_date);
                    if ((exp - now) / (1000 * 60 * 60 * 24) < 7) {
                        expiringCount++;
                    }
                });
                document.getElementById('expiring-count').textContent = expiringCount;
                document.querySelectorAll('.stat-card.warning h2')[0].textContent = expiringCount;
            }

            if (recResult.message === 'success') {
                const recipes = recResult.data;
                let matchedRecipes = recipes.filter(r => r.matchScore > 0).length;
                document.getElementById('recipes-matched-stat').textContent = matchedRecipes;
            }

        } catch (err) {
            console.error("Dashboard update failed", err);
        }
    }

    // Initial load
    updateDashboard();
});
