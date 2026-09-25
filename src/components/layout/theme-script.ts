export const THEME_STORAGE_KEY = "naera-theme";

/**
 * Script exécuté avant le premier rendu : applique le thème enregistré
 * (ou celui du système) sans flash. Voir le guide « Preventing flash ».
 * Module sans "use client" : la chaîne doit rester lisible côté serveur.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].removeAttribute("media");m[i].setAttribute("content",d?"#0a0b0f":"#f4f5f7")}}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`;
