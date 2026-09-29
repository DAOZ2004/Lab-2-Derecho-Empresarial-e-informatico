const form = document.querySelector("#calculator");
const formError = document.querySelector("#form-error");
const noExtras = document.querySelector("#no-extras");
const extrasGrid = document.querySelector(".extras-grid");
const statusLabel = document.querySelector("#result-status");
const calculationNote = document.querySelector("#calculation-note");
const numberValue = (name) => Number(new FormData(form).get(name) || 0);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function countServiceDays() {
  const years = numberValue("years");
  const months = numberValue("months");
  const extraDays = numberValue("extra-days");
  return years * 360 + months * 30 + extraDays;
}

function daysSinceVacationAnniversary(hireDate, terminationDate) {
  if (!hireDate) return numberValue("months") * 30 + numberValue("extra-days");

  const [hireYear, hireMonth, hireDay] = hireDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = terminationDate.split("-").map(Number);
  const termination = Date.UTC(endYear, endMonth - 1, endDay);
  let anniversary = Date.UTC(endYear, hireMonth - 1, hireDay);
  if (anniversary > termination) anniversary = Date.UTC(endYear - 1, hireMonth - 1, hireDay);
  return Math.max(0, Math.floor((termination - anniversary) / 86400000));
}

function calculate() {
  const salary = numberValue("salary");
  const serviceDays = countServiceDays();
  const months = numberValue("months");
  const extraDays = numberValue("extra-days");
  const minimumWage = numberValue("minimum-wage");
  const hireDate = form.elements["hire-date"].value;
  const terminationDate = form.elements["termination-date"].value;
  const dailySalary = salary / 30;
  const serviceYears = serviceDays / 360;
  const accruedVacationDays = daysSinceVacationAnniversary(hireDate, terminationDate);
  const vacation = dailySalary * 15 * 1.3 * accruedVacationDays / 360;
  const cause = new FormData(form).get("cause");
  let indemnity = 0;

  if (cause === "dismissal") {
    indemnity = Math.min(salary, minimumWage * 4) * serviceYears;
  } else if (serviceYears >= 2) {
    const remainder = serviceDays % 360;
    const resignationYears = Math.floor(serviceDays / 360) + (remainder >= 180 ? remainder / 360 : 0);
    indemnity = Math.min(salary, minimumWage * 2) / 2 * resignationYears;
  }

  const dayHours = noExtras.checked ? 0 : numberValue("day-hours");
  const nightHours = noExtras.checked ? 0 : numberValue("night-hours");
  const holidayDays = noExtras.checked ? 0 : numberValue("holiday-days");
  const restDays = noExtras.checked ? 0 : numberValue("rest-days");
  const hourlySalary = dailySalary / 8;
  const results = {
    vacation,
    indemnity,
    dayOvertime: dayHours * hourlySalary * 2,
    nightOvertime: nightHours * hourlySalary * 2 * 1.25,
    holiday: holidayDays * dailySalary,
    rest: restDays * dailySalary * 1.5
  };
  for (const key of Object.keys(results)) {
    results[key] = Math.round((results[key] + Number.EPSILON) * 100) / 100;
  }
  results.total = Object.values(results).reduce((sum, value) => sum + value, 0);

  for (const [key, amount] of Object.entries(results)) {
    document.querySelector(`[data-result="${key}"]`).textContent = money.format(amount);
  }
  document.querySelector("#indemnity-label").textContent = cause === "dismissal"
    ? "Indemnización por despido injustificado"
    : "Compensación por renuncia voluntaria";
  statusLabel.textContent = "CÁLCULO ACTUALIZADO";

  calculationNote.textContent = `Bases usadas: salario diario = salario mensual / 30; salario por hora diurna = salario diario / 8. Vacación = 15 días + 30% de recargo, proporcional a ${accruedVacationDays} días de la fracción anual. La indemnización usa como base máxima 4 salarios mínimos mensuales en despido o 2 en renuncia; la renuncia requiere 2 años y considera fracciones superiores a 6 meses. Asueto = salario diario adicional; descanso semanal = 1.5 salarios diarios. Montos brutos, sin deducciones.`;
}

function validateForm() {
  const requiredFields = [...form.querySelectorAll("input[required]")];
  const invalid = requiredFields.find((field) => !field.checkValidity());
  const months = numberValue("months");
  const extraDays = numberValue("extra-days");
  const numericFields = [...form.querySelectorAll('input[type="number"]')];
  const invalidNumber = numericFields.find((field) => field.value !== "" && (!Number.isFinite(Number(field.value)) || Number(field.value) < 0));

  if (invalid || invalidNumber || months > 11 || extraDays > 29) {
    formError.textContent = "Revisa los datos: deben ser valores válidos y no negativos; los meses van de 0 a 11 y los días de 0 a 29.";
    (invalid || invalidNumber || form.elements.months).focus();
    return false;
  }
  formError.textContent = "";
  return true;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (validateForm()) calculate();
});

form.addEventListener("input", () => {
  if (statusLabel.textContent === "CÁLCULO ACTUALIZADO" && validateForm()) calculate();
});

noExtras.addEventListener("change", () => {
  extrasGrid.classList.toggle("is-disabled", noExtras.checked);
  for (const field of extrasGrid.querySelectorAll("input")) field.disabled = noExtras.checked;
  if (statusLabel.textContent === "CÁLCULO ACTUALIZADO" && validateForm()) calculate();
});

document.querySelector("#print-button").addEventListener("click", () => window.print());

if (validateForm()) calculate();