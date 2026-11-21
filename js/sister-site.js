/* Legacy Bowling Academy public site.
   Preview URL until the academy has its own domain. Change this line only.
   The footer mark on index.html and privacy.html reads it. */
(function () {
  var url = "https://sjkram85.github.io/legacy-bowling-academy-website/";
  var links = document.querySelectorAll("[data-sister-site]");
  for (var i = 0; i < links.length; i++) {
    links[i].href = url;
  }
})();
