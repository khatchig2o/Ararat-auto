document.addEventListener("DOMContentLoaded", () => {
  ["feedbackForm", "bookingForm"].forEach((id) => {
    const f = document.getElementById(id);
    if (!f) return;
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      let res, json;
      if (id === "bookingForm") {
        // Use FormData for booking (with files)
        const formData = new FormData(f);
        res = await fetch(f.action, {
          method: "POST",
          body: formData,
        });
      } else {
        // Use URLSearchParams for feedback (no files)
        const formData = new URLSearchParams(new FormData(f));
        res = await fetch(f.action, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });
      }
      json = await res.json();
      const box = document.getElementById(
        id === "feedbackForm" ? "formMessage" : "bookingMessage"
      );
      if (json.ok) {
        f.reset();
        box.textContent = "✅ Sent! We’ll contact you soon.";
      } else {
        box.textContent = "❌ Error. Try again.";
      }
    });
  });
});
