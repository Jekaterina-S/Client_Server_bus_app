document.addEventListener("DOMContentLoaded", () => {
    const sendStopButton = document.getElementById('sendStopButton');
    const busList = document.querySelector('.busList');
    const busListLabel = document.querySelector('label[for="busList"]');
    let selectedStopId = null;

    // Fetch buses for the selected stop
    async function fetchBuses(stopId) {
        try {
            const response = await fetch(`http://busstopsearch-a6hdaph8acgpdyhj.swedencentral-01.azurewebsites.net/buses?stop=${encodeURIComponent(stopId)}`);
            const buses = await response.json();

            // Clear existing bus buttons
            busList.innerHTML = '';

            buses.forEach(bus => {createBusButton(bus)});

            if (buses.length > 0) {
                animateButtons();
            } else {
                busListLabel.textContent = 'Ei leidud ühtegi bussi... Proovige teist peatust.';
            }
        } catch (error) {
            console.error('Error fetching buses:', error);
        }
    }

    // Fetch arrival times
    async function fetchArrivalTimes(routeId, stopId, button) {
        const currentTime = new Date();
        const localISOTime = currentTime.toISOString();
        const offset = currentTime.getTimezoneOffset();

        // Check if timezone offset is being passed correctly
        // If offset is invalid assumes default UTC+2
        if (isNaN(offset)) {
            console.error('Timezone offset is invalid.');
            offset = -120;
        }

        let infoDiv = button.nextElementSibling;

        // Check if the arrival times block already exists and toggle visibility
        if (infoDiv && infoDiv.classList.contains('arrival-info')) {
            infoDiv.style.display = infoDiv.style.display === 'none' ? 'block' : 'none';
            return;
        }

        try {
            const response = await fetch(`http://busstopsearch-a6hdaph8acgpdyhj.swedencentral-01.azurewebsites.net/arrival-times?route=${routeId}&stop=${stopId}&reference_date=${encodeURIComponent(localISOTime)}&offset=${offset}`);
            const arrivalTimes = await response.json();

            const groupedArrivalTimes = groupArrivalTimesByTrip(arrivalTimes);
            displayArrivalTimes(groupedArrivalTimes, button);       
        } catch (error) {
            console.error('Error fetching nearest arrival times:', error);
        }
    }

    // Helper function to create bus buttons
    function createBusButton(bus) {
        const button = document.createElement('button');
        button.className = 'btn btn-primary mx-1 text-center btnNum';
        button.id = bus.route_id;
        button.textContent = bus.route_short_name;
        button.addEventListener('click', () => {
            fetchArrivalTimes(bus.route_id, selectedStopId, button);
            button.classList.toggle('active');
        });
        busList.appendChild(button);
    }

    // Helper function to group arrival times by trip_long_name
    function groupArrivalTimesByTrip(arrivalTimes) {
        return arrivalTimes.reduce((grouped, time) => {
            if (!grouped[time.trip_long_name]) {
                grouped[time.trip_long_name] = [];
            }
            grouped[time.trip_long_name].push(time);
            return grouped;
        }, {});
    }

    // Helper function to format the time
    function formatTime(arrivalTime) {
        const arrivalDate = new Date(arrivalTime);
        const localTimeString = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); // timeZone for time to remain unchanged
        return `${localTimeString} ${isToday(arrivalTime) ? '' : 'Homme'}`;
    }

    // Helper function to check if given date not today
    function isToday(date) {
        const day = new Date(date);
        const now = new Date();
        return day.getDate() === now.getDate();
    }

    // Helper function to display arrival times
    function displayArrivalTimes(groupedArrivalTimes, button) {
        let infoDiv = button.nextElementSibling;
        if (!infoDiv || !infoDiv.classList.contains('arrival-info')) {
            infoDiv = document.createElement('div');
            infoDiv.className = 'arrival-info mb-2';
            button.insertAdjacentElement('afterend', infoDiv);
        }

        infoDiv.innerHTML = '';

        if (Object.keys(groupedArrivalTimes).length > 0) {
            const list = document.createElement('ul');
            list.className = 'list-group';

            Object.keys(groupedArrivalTimes).forEach(tripName => {
                const tripGroup = groupedArrivalTimes[tripName];
                const tripHeader = document.createElement('li');
                tripHeader.className = 'list-group-item list-group-item-info';
                tripHeader.classList.add = 'text-wrap';
                tripHeader.textContent = `Suund: ${tripName}`;
                list.appendChild(tripHeader);

                tripGroup.forEach(time => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item';
                    listItem.classList.add(isToday(time.arrival_time) ? 'text-dark' : 'text-primary');
                    listItem.textContent = `${formatTime(time.arrival_time)}`;
                    list.appendChild(listItem);
                });
            });

            infoDiv.appendChild(list);
        } else {
            infoDiv.textContent = 'Selle bussi saabumisaegu ei ole leitud.';
        }
    }

    // Bus button animation
    function animateButtons() {
        const buttons = busList.querySelectorAll('.btnNum');
        buttons.forEach((button, index) => {
            button.style.opacity = '0';
            button.style.transform = 'translateX(10px)';
            button.style.transition = `opacity 0.2s ease-out, transform 0.2s ease-out`;
            setTimeout(() => {
                button.style.opacity = '1';
                button.style.transform = 'translateX(0)';
            }, index * 40);
        });
    }

    // Event listeners to trigger selectedStopId update and bus fetch
    document.addEventListener('stopSelected', (event) => {
        selectedStopId = event.detail;
        busListLabel.textContent = 'Siin peatuvad järgmised bussid...';
    });

    document.addEventListener('userStopSelected', (event) => {
        selectedStopId = event.detail;
        fetchBuses(selectedStopId);
        busListLabel.textContent = 'Teie lähima peatuse bussid...';
    });

    sendStopButton.addEventListener('click', () => {
        if (selectedStopId) {
            fetchBuses(selectedStopId);
        } else {
            console.warn('No stop selected.');
        }
    });
});
