export const stringify = function (e) {
  var n = encodeURIComponent;

  if (!e) return "";
  var t = [];
  for (var r in e) {
    var i = e[r];
    if (!Array.isArray(i)) t.push(n(r) + "=" + n(e[r]));
    else for (var s = 0; s < i.length; ++s) t.push(n(r) + "=" + n(i[s]));
  }
  console.log(t);
  return t.join("&");
};
