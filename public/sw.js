/* Service worker for Web Push notifications */
self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data = { title: "Air", body: "Новое сообщение" };
  try {
    const parsed = event.data.json();
    if (parsed.title) data.title = parsed.title;
    if (parsed.body) data.body = parsed.body;
  } catch (_) {
    data.body = event.data.text() || data.body;
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      tag: "air-message",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes("/chat") && "focus" in client) {
          client.focus();
          return client.navigate("/chat");
        }
      }
      if (clients.openWindow) return clients.openWindow("/chat");
    })
  );
});
