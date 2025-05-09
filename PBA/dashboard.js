document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in before loading dashboard
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser && !window.location.pathname.includes('index.html') && 
        !window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('signup.html')) {
        // If user is not logged in and trying to access dashboard pages, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize the sidebar
    initSidebar();
    
    // Initialize the profile dropdown
    initProfileDropdown();
    
    // Initialize the token widget
    initTokenWidget();
    
    // Display current date
    displayCurrentDate();
    
    // Initialize tab switching in settings
    initSettingsTabs();
    
    // Initialize rewards page functionality if on rewards page
    if (document.querySelector('.rewards-listing')) {
        initRewardsPage();
    }
    
    // Show random motivational quote if on rewards page
    if (document.getElementById('motivational-quote')) {
        showRandomQuote();
    }
});

// Sidebar Toggle
function initSidebar() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');
    const dashboardContent = document.querySelector('.dashboard-content');
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', function() {
            if (window.innerWidth < 992) {
                // For mobile: sidebar slides in from left
                sidebar.classList.toggle('expanded');
            } else {
                // For desktop: sidebar collapses/expands
                sidebar.classList.toggle('collapsed');
                dashboardContent.classList.toggle('full-width');
            }
        });
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', function() {
            if (window.innerWidth < 992) {
                sidebar.classList.remove('expanded');
            } else {
                sidebar.classList.add('collapsed');
                dashboardContent.classList.add('full-width');
            }
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const isMobile = window.innerWidth < 992;
        if (isMobile && sidebar.classList.contains('expanded')) {
            if (!sidebar.contains(e.target) && e.target !== hamburgerBtn) {
                sidebar.classList.remove('expanded');
            }
        }
    });
    
    // Update sidebar username if logged in
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            const sidebarUsername = document.getElementById('sidebar-username');
            if (sidebarUsername) {
                sidebarUsername.textContent = user.name || 'User';
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
}

// Profile Dropdown
function initProfileDropdown() {
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (profileDropdown.classList.contains('show')) {
                if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
                    profileDropdown.classList.remove('show');
                }
            }
        });
        
        // Handle profile settings click
        const settingsLink = profileDropdown.querySelector('a[href="#settings"]');
        if (settingsLink) {
            settingsLink.addEventListener('click', function(e) {
                e.preventDefault();
                showProfileSettingsModal();
            });
        }
    }
}

// Token Widget
function initTokenWidget() {
    const tokenWidget = document.getElementById('token-widget');
    const tokenCount = document.getElementById('token-count');
    
    if (tokenWidget && window.location.pathname.includes('home.html')) {
        tokenWidget.addEventListener('click', function() {
            window.location.href = 'rewards.html';
        });
    }
    
    // Update token count from localStorage if available
    const savedTokens = localStorage.getItem('userTokens');
    if (savedTokens && tokenCount) {
        tokenCount.textContent = savedTokens;
    }
    
    // Set token count in all places where it appears
    const tokenElements = document.querySelectorAll('.token-count');
    if (tokenElements.length > 0 && savedTokens) {
        tokenElements.forEach(el => {
            el.textContent = savedTokens;
        });
    }
}

// Display Current Date
function displayCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Settings Tabs
function initSettingsTabs() {
    const settingsTabs = document.querySelectorAll('.settings-sidebar li');
    if (settingsTabs.length > 0) {
        settingsTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // Remove active class from all tabs
                settingsTabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Hide all tab contents
                document.querySelectorAll('.settings-tab').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show selected tab content
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
}

// Profile Settings Modal
function showProfileSettingsModal() {
    const modal = document.getElementById('profile-settings-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Close modal when clicking X
        const closeButton = modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// Rewards Page Functions
function initRewardsPage() {
    // Sort rewards
    const sortSelect = document.getElementById('sort-type');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortRewards(this.value);
        });
    }
    
    // Filter rewards
    const filterSelect = document.getElementById('filter-type');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            filterRewards(this.value);
        });
    }
    
    // Search rewards
    const searchInput = document.getElementById('search-rewards');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchRewards(this.value);
        });
    }
    
    // Redeem buttons
    const redeemButtons = document.querySelectorAll('.reward-btn');
    if (redeemButtons.length > 0) {
        redeemButtons.forEach(button => {
            button.addEventListener('click', function() {
                const rewardItem = this.closest('.reward-item');
                const rewardTitle = rewardItem.querySelector('h3').textContent;
                const rewardDescription = rewardItem.querySelector('.reward-description').textContent;
                const rewardPrice = rewardItem.querySelector('.price-tokens').textContent;
                const rewardImage = rewardItem.querySelector('img').src;
                
                showRedemptionModal(rewardTitle, rewardDescription, rewardPrice, rewardImage);
            });
        });
    }
}

// Sort Rewards
function sortRewards(sortType) {
    const rewardsGrid = document.querySelector('.rewards-grid');
    if (!rewardsGrid) return;
    
    const rewards = Array.from(rewardsGrid.querySelectorAll('.reward-item'));
    
    rewards.sort((a, b) => {
        if (sortType === 'price-low') {
            return parseInt(a.dataset.price) - parseInt(b.dataset.price);
        } else if (sortType === 'price-high') {
            return parseInt(b.dataset.price) - parseInt(a.dataset.price);
        } else if (sortType === 'alphabetical') {
            const titleA = a.querySelector('h3').textContent;
            const titleB = b.querySelector('h3').textContent;
            return titleA.localeCompare(titleB);
        } 
        // Default is 'newest', no sort needed
        return 0;
    });
    
    // Clear and re-append sorted items
    rewardsGrid.innerHTML = '';
    rewards.forEach(reward => {
        rewardsGrid.appendChild(reward);
    });
}

// Filter Rewards
function filterRewards(filterType) {
    const rewards = document.querySelectorAll('.reward-item');
    const userTokens = parseInt(document.getElementById('token-count').textContent) || 0;
    
    rewards.forEach(reward => {
        const price = parseInt(reward.dataset.price);
        const category = reward.dataset.category;
        
        if (filterType === 'all') {
            reward.style.display = 'block';
        } else if (filterType === 'affordable') {
            reward.style.display = price <= userTokens ? 'block' : 'none';
        } else if (filterType === category) {
            reward.style.display = 'block';
        } else {
            reward.style.display = 'none';
        }
    });
}

// Search Rewards
function searchRewards(query) {
    if (!query) {
        document.querySelectorAll('.reward-item').forEach(item => {
            item.style.display = 'block';
        });
        return;
    }
    
    query = query.toLowerCase();
    document.querySelectorAll('.reward-item').forEach(item => {
        const title = item.querySelector('h3').textContent.toLowerCase();
        const description = item.querySelector('.reward-description').textContent.toLowerCase();
        
        if (title.includes(query) || description.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Show Redemption Modal
function showRedemptionModal(title, description, cost, image) {
    const modal = document.getElementById('redemption-modal');
    if (!modal) return;
    
    // Set modal content
    document.getElementById('redemption-title').textContent = title;
    document.getElementById('redemption-description').textContent = description;
    document.getElementById('redemption-cost').textContent = cost;
    document.getElementById('redemption-img').src = image;
    
    const userTokens = parseInt(document.getElementById('token-count').textContent) || 0;
    document.getElementById('redemption-balance').textContent = userTokens;
    
    // Disable confirm button if not enough tokens
    const confirmButton = document.getElementById('confirm-redemption');
    if (userTokens < parseInt(cost)) {
        confirmButton.disabled = true;
        confirmButton.textContent = 'Not Enough Tokens';
        confirmButton.classList.add('disabled');
    } else {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirm Redemption';
        confirmButton.classList.remove('disabled');
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Close modal when clicking X
    const closeButton = modal.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle cancel
    const cancelButton = document.getElementById('cancel-redemption');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Handle confirm redemption
    confirmButton.addEventListener('click', function() {
        if (userTokens >= parseInt(cost)) {
            // Deduct tokens
            const newTokens = userTokens - parseInt(cost);
            document.getElementById('token-count').textContent = newTokens;
            localStorage.setItem('userTokens', newTokens);
            
            // Add to redemption history
            addToRedemptionHistory(title);
            
            // Close modal
            modal.style.display = 'none';
            
            // Show success message
            alert(`Successfully redeemed ${title}!`);
        }
    });
}

// Add to Redemption History
function addToRedemptionHistory(title) {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;
    
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <div class="history-details">
            <h4>${title}</h4>
            <p>Redeemed on: <span>${formattedDate}</span></p>
        </div>
        <div class="history-status">
            <span class="status-badge delivered">Delivered</span>
        </div>
    `;
    
    // Add to the top of the list
    historyList.insertBefore(historyItem, historyList.firstChild);
}

// Show Random Motivational Quote
function showRandomQuote() {
    const quotes = [
        {
            text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
            author: "Winston Churchill"
        },
        {
            text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
            author: "Malcolm X"
        },
        {
            text: "The beautiful thing about learning is that nobody can take it away from you.",
            author: "B.B. King"
        },
        {
            text: "The only person who is educated is the one who has learned how to learn and change.",
            author: "Carl Rogers"
        },
        {
            text: "Learning is not attained by chance, it must be sought for with ardor and diligence.",
            author: "Abigail Adams"
        },
        {
            text: "You don't have to be great to start, but you have to start to be great.",
            author: "Zig Ziglar"
        },
        {
            text: "The expert in anything was once a beginner.",
            author: "Helen Hayes"
        },
        {
            text: "Success consists of going from failure to failure without loss of enthusiasm.",
            author: "Winston Churchill"
        }
    ];
    
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quoteElement = document.getElementById('motivational-quote');
    const authorElement = document.querySelector('.quote-author');
    
    if (quoteElement && authorElement) {
        quoteElement.textContent = `"${quotes[randomIndex].text}"`;
        authorElement.textContent = `- ${quotes[randomIndex].author}`;
    }
} 