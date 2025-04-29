document.addEventListener("DOMContentLoaded", () => {
  const typeSelect = document.getElementById("type");
  const complaintSection = document.getElementById("complaintSection");
  const applicationSection = document.getElementById("applicationSection");
  const complaintFields = document.querySelectorAll("#complaintSection input, #complaintSection textarea");
  const applicationFields = document.querySelectorAll("#applicationSection input, #applicationSection textarea, #applicationSection select");

  // Hide or show sections and enable/disable fields based on the selected type
  typeSelect.addEventListener("change", () => {
    if (typeSelect.value === "complaint") {
      complaintSection.classList.remove("hidden");
      applicationSection.classList.add("hidden");

      // Enable complaint fields and disable application fields
      complaintFields.forEach(field => field.disabled = false);
      applicationFields.forEach(field => field.disabled = true);
    } else if (typeSelect.value === "application") {
      applicationSection.classList.remove("hidden");
      complaintSection.classList.add("hidden");

      // Enable application fields and disable complaint fields
      applicationFields.forEach(field => field.disabled = false);
      complaintFields.forEach(field => field.disabled = true);
    } else {
      // Hide both sections and disable all fields
      complaintSection.classList.add("hidden");
      applicationSection.classList.add("hidden");
      complaintFields.forEach(field => field.disabled = true);
      applicationFields.forEach(field => field.disabled = true);
    }
  });

  // Trigger the change event on page load to set the initial state
  typeSelect.dispatchEvent(new Event("change"));

  // Handle response display for users
  const responseMessage = document.getElementById("responseMessage");
  if (responseMessage) {
    const status = responseMessage.dataset.status;
    if (status === "accepted") {
      responseMessage.textContent = "Ваше повідомлення було прийнято.";
      responseMessage.classList.add("accepted");
    } else if (status === "rejected") {
      responseMessage.textContent = "Ваше повідомлення було відхилено.";
      responseMessage.classList.add("rejected");
    }
  }
});
