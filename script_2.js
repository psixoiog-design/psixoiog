
(function(){
  // Centralized safety handler for dynamically created controls.
  // v1.14 had the visual .new-report-btn but no action attached to it.
  document.addEventListener("click", function(e){
    const b = e.target && e.target.closest ? e.target.closest("button") : null;
    if(!b) return;
    b.style.pointerEvents = "auto";
    if(b.classList.contains("new-report-btn")){
      e.preventDefault();
      e.stopPropagation();
      try{
        const store = b.getAttribute("data-store") || undefined;
        if(typeof window.newReport === "function") window.newReport(store);
        else console.error("ATLANT/ASMAN: newReport is not available");
      }catch(err){
        console.error("ATLANT/ASMAN: ошибка открытия нового отчёта", err);
        alert("Не удалось открыть форму нового отчёта. Обновите страницу.");
      }
    }
  }, false);
})();
