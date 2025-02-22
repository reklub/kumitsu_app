 // Add animation class to tournament cards when loaded
 window.onload = function () {
    const cards = document.querySelectorAll('.tournament-card');
    cards.forEach(card => {
        card.classList.add('animate__fadeInUp');
    });
};