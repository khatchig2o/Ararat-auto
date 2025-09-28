document.addEventListener("DOMContentLoaded", () => {
  // Set min date/time for booking (30 minutes from now)
  const bookingTime = document.getElementById("bookingTime");
  if (bookingTime) {
    function pad(n) {
      return n < 10 ? "0" + n : n;
    }
    function getMinDateTime() {
      const now = new Date(Date.now() + 30 * 60000); // 30 minutes from now
      const yyyy = now.getFullYear();
      const mm = pad(now.getMonth() + 1);
      const dd = pad(now.getDate());
      const hh = pad(now.getHours());
      const min = pad(now.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }
    bookingTime.min = getMinDateTime();
    bookingTime.value = getMinDateTime();
  }

  // Arrow-based carousel logic (manual scroll, hide arrows at ends)
  const carousel = document.querySelector(".reviews-carousel");
  const leftArrow = document.querySelector(".carousel-arrow.left");
  const rightArrow = document.querySelector(".carousel-arrow.right");
  if (carousel && leftArrow && rightArrow) {
    const reviews = carousel.querySelectorAll(".review");
    let currentIndex = 0;

    function getReviewWidth() {
      const review = reviews[0];
      const style = window.getComputedStyle(carousel);
      const gap = parseInt(style.gap) || 32; // fallback to 32px
      return review.offsetWidth + gap;
    }

    function updateArrows(index) {
      leftArrow.style.visibility = index === 0 ? "hidden" : "visible";
      rightArrow.style.visibility =
        index === reviews.length - 2 ? "hidden" : "visible";
    }

    function scrollToIndex(index) {
      const reviewWidth = getReviewWidth();
      carousel.scrollTo({
        left: reviewWidth * index,
        behavior: "smooth",
      });
      updateArrows(index);
    }

    leftArrow.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        scrollToIndex(currentIndex);
      }
    });

    rightArrow.addEventListener("click", () => {
      if (currentIndex < reviews.length - 1) {
        currentIndex++;
        scrollToIndex(currentIndex);
      }
    });

    carousel.addEventListener("scroll", () => {
      const reviewWidth = getReviewWidth();
      const idx = Math.round(carousel.scrollLeft / reviewWidth);
      if (idx !== currentIndex) {
        currentIndex = idx;
        updateArrows(currentIndex);
      }
    });

    // Initial state
    scrollToIndex(currentIndex);
  }

  // Booking form custom submit
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Collect form data
      const formData = {
        car: bookingForm.elements["car"].value,
        service: bookingForm.elements["service"].value,
        phone: bookingForm.elements["phone"].value,
        time: bookingForm.elements["time"].value,
        timestamp: Date.now(),
      };
    });
  }

  const fileInput = document.getElementById("bookingImage");
  const previewContainer = document.getElementById("imagePreview");

  // Store selected files in an array
  let selectedFiles = [];

  fileInput.addEventListener("change", (e) => {
    // Merge new files with existing ones
    const newFiles = Array.from(e.target.files);
    // Prevent duplicates by name and size
    newFiles.forEach((file) => {
      if (
        !selectedFiles.some((f) => f.name === file.name && f.size === file.size)
      ) {
        selectedFiles.push(file);
      }
    });
    renderPreviews();
    updateFileInput();
    // Reset input so user can add same file again if needed
    fileInput.value = "";
  });

  function renderPreviews() {
    previewContainer.innerHTML = "";
    selectedFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const div = document.createElement("div");
        div.className = "preview-thumb";
        div.innerHTML = `
          <img src="${ev.target.result}" alt="Preview" />
          <button type="button" class="remove-img" data-idx="${idx}">✖</button>
        `;
        previewContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  // Remove image on click
  previewContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-img")) {
      const idx = Number(e.target.getAttribute("data-idx"));
      selectedFiles.splice(idx, 1);
      updateFileInput();
      renderPreviews();
    }
  });

  // Update the file input with the current selectedFiles
  function updateFileInput() {
    const dataTransfer = new DataTransfer();
    selectedFiles.forEach((file) => dataTransfer.items.add(file));
    fileInput.files = dataTransfer.files;
  }
});
