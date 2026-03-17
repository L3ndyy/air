/* Service worker for Web Push notifications (Windows toast — справа снизу) */
self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data = { title: "Air", body: "Новое сообщение", url: "/chat" };
  try {
    const parsed = event.data.json();
    if (parsed.title) data.title = parsed.title;
    if (parsed.body) data.body = parsed.body;
    if (parsed.url) data.url = parsed.url;
  } catch (_) {
    data.body = event.data.text() || data.body;
  }
  var iconUrl = (self.location.origin || "") + "/icon.svg";
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: iconUrl,
      badge: iconUrl,
      tag: "air-message",
      renotify: true,
      silent: false,
      requireInteraction: false,
      data: { url: data.url || "/chat" },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/chat";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
          client.focus();
          if (url && client.navigate) return client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow && url) return clients.openWindow(url);
    })
  );
});
