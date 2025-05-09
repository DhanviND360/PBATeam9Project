// Rewards Page Specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the rewards page
    initRewardsPage();
    
    // Load and display a random motivational quote
    showRandomQuote();
});

// Initialize rewards page specific functionality
function initRewardsPage() {
    // Setup reward item interactions
    setupRewardItems();
    
    // Set up sorting functionality
    const sortSelect = document.getElementById('sort-type');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortRewards(this.value);
        });
    }
    
    // Set up filtering functionality
    const filterSelect = document.getElementById('filter-type');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            filterRewards(this.value);
        });
    }
    
    // Set up search functionality
    const searchInput = document.getElementById('search-rewards');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchRewards(this.value);
        });
    }
}

// Setup reward item interactions
function setupRewardItems() {
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

// Sort rewards based on selected criteria
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
    
    // Re-append items in sorted order
    rewards.forEach(reward => {
        rewardsGrid.appendChild(reward);
    });
}

// Filter rewards based on selected criteria
function filterRewards(filterType) {
    const rewards = document.querySelectorAll('.reward-item');
    const userTokens = parseInt(document.getElementById('token-count').textContent) || 0;
    
    rewards.forEach(reward => {
        const rewardPrice = parseInt(reward.dataset.price);
        const rewardCategory = reward.dataset.category;
        
        if (filterType === 'all' || 
            (filterType === 'affordable' && rewardPrice <= userTokens) ||
            (filterType === rewardCategory)) {
            reward.style.display = 'block';
        } else {
            reward.style.display = 'none';
        }
    });
}

// Search rewards by title and description
function searchRewards(query) {
    if (!query) {
        // If search is empty, show all rewards
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

// Show redemption modal with reward details
function showRedemptionModal(title, description, cost, image) {
    const modal = document.getElementById('redemption-modal');
    const modalTitle = document.getElementById('redemption-title');
    const modalDescription = document.getElementById('redemption-description');
    const modalCost = document.getElementById('redemption-cost');
    const modalBalance = document.getElementById('redemption-balance');
    const modalImage = document.getElementById('redemption-img');
    const confirmButton = document.getElementById('confirm-redemption');
    const cancelButton = document.getElementById('cancel-redemption');
    
    if (!modal) return;
    
    // Set modal content
    modalTitle.textContent = title;
    modalDescription.textContent = description;
    modalCost.textContent = cost;
    modalImage.src = image;
    
    // Get user's token balance
    const userTokens = parseInt(document.getElementById('token-count').textContent) || 0;
    modalBalance.textContent = userTokens;
    
    // Disable confirm button if not enough tokens
    if (parseInt(cost) > userTokens) {
        confirmButton.disabled = true;
        confirmButton.classList.add('disabled');
    } else {
        confirmButton.disabled = false;
        confirmButton.classList.remove('disabled');
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Handle close button
    const closeButton = modal.querySelector('.close-modal');
    closeButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Handle confirm button
    confirmButton.onclick = function() {
        if (parseInt(cost) <= userTokens) {
            // Deduct tokens
            const newBalance = userTokens - parseInt(cost);
            document.getElementById('token-count').textContent = newBalance;
            
            // If there's a token-count display on the page, update that too
            const tokenCountDisplay = document.querySelector('.token-count');
            if (tokenCountDisplay) {
                tokenCountDisplay.textContent = newBalance;
            }
            
            // Save new token balance to localStorage
            localStorage.setItem('userTokens', newBalance);
            
            // Add to redemption history
            addToRedemptionHistory(title);
            
            // Close modal
            modal.style.display = 'none';
            
            // Show success message
            alert(`Successfully redeemed ${title}!`);
        }
    };
    
    // Handle cancel button
    cancelButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// Add redeemed item to redemption history
function addToRedemptionHistory(title) {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <div class="history-details">
            <h4>${title}</h4>
            <p>Redeemed on: <span>${formattedDate}</span></p>
        </div>
        <div class="history-status">
            <span class="status-badge pending">Pending</span>
        </div>
    `;
    
    // Add new history item at the top
    historyList.insertBefore(historyItem, historyList.firstChild);
}

// Display a random motivational quote
function showRandomQuote() {
    const quoteElement = document.getElementById('motivational-quote');
    const authorElement = document.querySelector('.quote-author');
    
    if (!quoteElement || !authorElement) return;
    
    const quotes = [
        { quote: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
        { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
        { quote: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
        { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
        { quote: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
        { quote: "Learning is not attained by chance, it must be sought for with ardor and diligence.", author: "Abigail Adams" },
        { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
        { quote: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
        { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" }
    ];
    
    // Select a random quote
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const selectedQuote = quotes[randomIndex];
    
    // Update the quote on the page
    quoteElement.textContent = `"${selectedQuote.quote}"`;
    authorElement.textContent = `- ${selectedQuote.author}`;
} 