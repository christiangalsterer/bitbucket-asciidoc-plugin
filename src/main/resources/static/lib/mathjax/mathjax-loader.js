(function () {
  /**
   * Loads MathJax from the official CDN
   */
  var script=document.createElement('script');
  script.type = "text/javascript";
  script.src = "https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-MML-AM_HTMLorMML";
  document.getElementsByTagName("head")[0].appendChild(script);

})();