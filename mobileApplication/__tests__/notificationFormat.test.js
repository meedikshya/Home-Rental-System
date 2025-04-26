const NotificationFormatter = {
  // Template strings for different notification types
  templates: {
    booking: {
      title: "Booking {{status}}",
      body: "Your booking for {{propertyName}} has been {{status}}.",
      action: "View Booking",
    },
    payment: {
      title: "Payment {{status}}",
      body: "Your payment of Rs. {{amount}} for {{propertyName}} has been {{status}}.",
      action: "View Receipt",
    },
    agreement: {
      title: "Rental Agreement {{status}}",
      body: "Your rental agreement for {{propertyName}} has been {{status}}.",
      action: "View Agreement",
    },
    message: {
      title: "New Message from {{sender}}",
      body: "{{message}}",
      action: "Reply",
    },
  },
  // Format date in human-readable form
  formatDate: function (dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },
  // Replace template placeholders with actual values
  applyTemplate: function (template, data) {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    return result;
  },
  // Format a complete notification
  formatNotification: function (notification) {
    // Default to 'message' type if not specified
    const type = notification.type || "message";
    // Get the appropriate template
    const template = this.templates[type] || this.templates.message;
    // Format the notification content
    const title = this.applyTemplate(template.title, notification.data);
    const body = this.applyTemplate(template.body, notification.data);
    // Format the timestamp
    const formattedTime = this.formatDate(notification.timestamp);
    return {
      id: notification.id,
      type: notification.type,
      title: title,
      body: body,
      action: template.action,
      time: formattedTime,
      read: notification.read || false,
      data: notification.data,
    };
  },
};
describe("Notification Content Formatting", () => {
  // Test notifications
  const testNotifications = [
    {
      id: 1,
      type: "booking",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
      read: false,
      data: {
        propertyName: "Luxury Apartment",
        status: "confirmed",
      },
    },
    {
      id: 2,
      type: "payment",
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(), // 2 hours ago
      read: true,
      data: {
        propertyName: "Budget Room",
        status: "received",
        amount: "15000",
      },
    },
    {
      id: 3,
      type: "agreement",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString(), // 3 days ago
      read: false,
      data: {
        propertyName: "Family House",
        status: "signed",
      },
    },
    {
      id: 4,
      type: "message",
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60000).toISOString(), // 14 days ago
      read: false,
      data: {
        sender: "John Doe",
        message: "Is this property still available?",
      },
    },
  ];
  test("Should format booking notification correctly", () => {
    const notification = testNotifications[0];
    const formatted = NotificationFormatter.formatNotification(notification);

    expect(formatted.title).toBe("Booking confirmed");
    expect(formatted.body).toBe(
      "Your booking for Luxury Apartment has been confirmed."
    );
    expect(formatted.action).toBe("View Booking");
    expect(formatted.time).toBe("30 minutes ago");
    expect(formatted.read).toBe(false);
  });

  test("Should format payment notification correctly", () => {
    const notification = testNotifications[1];
    const formatted = NotificationFormatter.formatNotification(notification);

    expect(formatted.title).toBe("Payment received");
    expect(formatted.body).toBe(
      "Your payment of Rs. 15000 for Budget Room has been received."
    );
    expect(formatted.action).toBe("View Receipt");
    expect(formatted.time).toBe("2 hours ago");
    expect(formatted.read).toBe(true);
  });

  test("Should format agreement notification correctly", () => {
    const notification = testNotifications[2];
    const formatted = NotificationFormatter.formatNotification(notification);

    expect(formatted.title).toBe("Rental Agreement signed");
    expect(formatted.body).toBe(
      "Your rental agreement for Family House has been signed."
    );
    expect(formatted.action).toBe("View Agreement");
    expect(formatted.time).toBe("3 days ago");
    expect(formatted.read).toBe(false);
  });

  test("Should format message notification correctly", () => {
    const notification = testNotifications[3];
    const formatted = NotificationFormatter.formatNotification(notification);

    expect(formatted.title).toBe("New Message from John Doe");
    expect(formatted.body).toBe("Is this property still available?");
    expect(formatted.action).toBe("Reply");
    expect(formatted.time).not.toContain("days ago");
    expect(formatted.read).toBe(false);
  });
  test("Should handle missing notification type", () => {
    const notification = {
      id: 5,
      timestamp: new Date().toISOString(),
      data: {
        sender: "System",
        message: "This is a system message",
      },
    };
    const formatted = NotificationFormatter.formatNotification(notification);
    // Should default to message type
    expect(formatted.title).toBe("New Message from System");
    expect(formatted.body).toBe("This is a system message");
    expect(formatted.action).toBe("Reply");
  });
  test("Should format dates based on recency", () => {
    // Test different timestamps
    const justNow = NotificationFormatter.formatDate(new Date().toISOString());
    expect(justNow).toBe("Just now");
    const minutesAgo = NotificationFormatter.formatDate(
      new Date(Date.now() - 45 * 60000).toISOString()
    );
    expect(minutesAgo).toBe("45 minutes ago");
    const hoursAgo = NotificationFormatter.formatDate(
      new Date(Date.now() - 5 * 60 * 60000).toISOString()
    );
    expect(hoursAgo).toBe("5 hours ago");
    const daysAgo = NotificationFormatter.formatDate(
      new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString()
    );
    expect(daysAgo).toBe("2 days ago");
  });
});
