document.addEventListener("DOMContentLoaded", () => {
    const areaDropdown = document.getElementById('areaDropdown');
    const areaInput = document.getElementById('areaInput');
    const stopDropdown = document.getElementById('stopDropdown');
    const stopInput = document.getElementById('stopInput');
    const sendAreaButton = document.getElementById('sendAreaButton');
    const sendStopButton = document.getElementById('sendStopButton');
    const clearEverything = document.getElementById('clearEverything');

    // General fetch function
    async function fetchData(url, callback) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            callback(data);
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
        }
    }

    // Function to filter dropdown list when typing
    function filterDropdown(input, dropdown) {
        const filter = input.value.toLowerCase();
        const items = dropdown.querySelectorAll('.dropdown-item');
        let hasVisibleItems = false;
        items.forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(filter) ? 'block' : 'none';
            if (item.style.display === 'block') {
                hasVisibleItems = true;
            }
        });
        dropdown.classList.toggle('show', hasVisibleItems);
    }

    function fillInput(input, event, btn) {
        input.value = event.target.textContent;
        event.currentTarget.classList.remove('show');
        btn.classList.remove('disabled');
    }

    // Add functionality to dropdown items
    function setupDropdown(input, dropdown, filterCallback, onSelectCallback) {
        input.addEventListener('focus', () => dropdown.classList.add('show'));
        input.addEventListener('input', () => filterCallback(input, dropdown));
        document.addEventListener('click', (event) => {
            if (!dropdown.contains(event.target) && !input.contains(event.target)) {
                dropdown.classList.remove('show');
            }
        });
        dropdown.addEventListener('click', (event) => {
            if (event.target && event.target.classList.contains('dropdown-item')) {
                onSelectCallback(event);
            }
        });
    }

    // Area dropdown setup 
    setupDropdown(
        areaInput,
        areaDropdown,
        filterDropdown,
        (event) => {
            fillInput(areaInput, event, sendAreaButton);
            stopInput.value = '';
            sendStopButton.classList.add('disabled');
            clearBusList();
        }
    );

    // Bus stop dropdown setup
    setupDropdown(
        stopInput,
        stopDropdown,
        filterDropdown,
        (event) => {
            fillInput(stopInput, event, sendStopButton);
            selectedStopId = event.target.id;
            document.dispatchEvent(new CustomEvent('stopSelected', { detail: selectedStopId }));
            clearBusList();
        }
    );

    // Fetch bus stops when area is selected and button is clicked
    sendAreaButton.addEventListener('click', () => {
        const selectedArea = areaInput.value;
        if (selectedArea) {
            fetchData(`http://localhost:3000/stops?area=${encodeURIComponent(selectedArea)}`, (stops) => {
                stopDropdown.innerHTML = '';
                stops.forEach(stop => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `<a id=${stop.stop_id} class="dropdown-item" href="#">${stop.stop_name}&nbsp;<sub class="sb text-muted lh-sm">${stop.stop_code}</sub></a>`;
                    stopDropdown.appendChild(listItem);
                });
            });
        }
    });

    // Fetch areas on page load
    fetchData(`http://localhost:3000/areas`, (areas) => {
        areas.forEach(area => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<a class="dropdown-item" href="#">${area.area}</a>`;
            areaDropdown.appendChild(listItem);
        });
    });

    function clearBusList() {
        const busList = document.querySelector('.busList');
        if (busList) {
            busList.innerHTML = '';
        }
    }

    // Clear every interactive field button
    clearEverything.addEventListener('click', () => {
        areaInput.value = '';
        sendAreaButton.classList.add('disabled');
        stopInput.value = '';
        sendStopButton.classList.add('disabled');
        selectedStopId = null;
        clearBusList();

        // Show all items in area dropdown
        const areaItems = areaDropdown.querySelectorAll('.dropdown-item');
        areaItems.forEach(item => {
            item.style.display = 'block';
        });
        areaDropdown.classList.remove('show');

        // Empty and hide stop dropdown
        stopDropdown.innerHTML = '';
        stopDropdown.classList.remove('show');
    
    });

    // Event listeners to disable send buttons if input fields are emptied
    areaInput.addEventListener('input', () => {
        if (areaInput.value === '') {
            sendAreaButton.classList.add('disabled');
            sendStopButton.classList.add('disabled');
        }
    });
    
    stopInput.addEventListener('input', () => {
        if (stopInput.value === '') {
            sendStopButton.classList.add('disabled');
        }
    });

    // Clear on page reload
    window.addEventListener('load', () => {
        clearEverything.click();
    });
});
