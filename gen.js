// --- FILE gen.js ---
const { faker } = require('@faker-js/faker');
const fs = require('fs');

function generateData() {
  const data = {
    users: [],
    categories: [],
    subCategories: [],
    menuItems: [],
    areaTables: [],
    tables: [],
    orders: [],
    orderHistory: [],
    feedback: [],
    statistics: [],
    aggregatedStatistics: [],
  };

  data.users = [
    {
      id: 'user1',
      username: 'admin_user',
      fullname: 'Admin User',
      role: 'admin',
      password: '123456',
      email: faker.internet.email(),
      phoneNumber: faker.phone.number(),
      isActive: true,
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
    },
    {
      id: 'user2',
      username: 'cashier_user',
      fullname: 'Cashier User',
      role: 'cashier',
      password: '123456',
      email: faker.internet.email(),
      phoneNumber: faker.phone.number(),
      isActive: true,
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
    },
    {
      id: 'user3',
      username: 'server_user',
      fullname: 'Server User',
      role: 'serve',
      password: '123456',
      email: faker.internet.email(),
      phoneNumber: faker.phone.number(),
      isActive: true,
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
    },
  ];

  data.categories = [
    { id: 'cat1', name: 'Drinks' },
    { id: 'cat2', name: 'Food' },
  ];

  const drinkSubCategories = ['Coffee', 'Tea', 'Juice', 'Smoothies'];
  const foodSubCategories = ['Pastries', 'Sandwiches', 'Salads'];
  let subCategoryId = 1,
    menuItemId = 1;

  [...drinkSubCategories, ...foodSubCategories].forEach((subCategoryName) => {
    const items = Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () =>
      String(menuItemId++),
    );
    data.subCategories.push({
      id: String(subCategoryId++),
      name: subCategoryName,
      category: subCategoryName === 'Drinks' ? 'cat1' : 'cat2',
      items,
    }); //Simplified category assignment
  });

  for (let i = 1; i < menuItemId; i++) {
    const subCategory = data.subCategories.find((sc) => sc.items.includes(String(i)));
    if (subCategory) {
      data.menuItems.push({
        id: String(i),
        name: faker.commerce.productName(),
        price: parseFloat(faker.commerce.price({ min: 2, max: 15, dec: 2 })),
        subCategory: subCategory.id,
        isAvailable: true,
      });
    }
  }

  const areas = ['Main Room', 'Patio'];
  let tableId = 1;
  areas.forEach((areaName, areaIndex) => {
    const tableIds = Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, () =>
      String(tableId++),
    );
    data.areaTables.push({ id: String(areaIndex + 1), name: areaName, tables: tableIds });
  });
  data.tables = Array.from({ length: tableId - 1 }, (_, i) => {
    const area = data.areaTables.find((a) => a.tables.includes(String(i + 1)));
    return {
      id: String(i + 1),
      tableName: `${area.name.replace(/\s+/g, '')}${i + 1}`,
      status: faker.helpers.arrayElement(['free', 'occupied']),
      areaId: area.id,
    };
  });

  const today = new Date().toISOString().split('T')[0];
  let orderIdCounter = 1;
  for (let i = 0; i < faker.number.int({ min: 3, max: 8 }); i++) {
    const orderItems = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => {
      const randomMenuItemId = String(faker.number.int({ min: 1, max: menuItemId - 1 }));
      const menuItem = data.menuItems.find((item) => item.id === randomMenuItemId);
      if (!menuItem) return null; // Handle potentially missing menu items
      return {
        id: `orderItem${orderIdCounter}${i}`,
        orderId: `order${orderIdCounter}`,
        menuItemId: randomMenuItemId,
        quantity: faker.number.int({ min: 1, max: 3 }),
        price: menuItem.price,
      };
    }).filter((item) => item !== null); // Remove null items

    data.orders.push({
      id: `order${orderIdCounter}`,
      tableId: String(faker.number.int({ min: 1, max: tableId - 1 })),
      orderStatus: 'completed',
      timestamp: faker.date
        .between({ from: today, to: new Date(today + 'T23:59:59') })
        .toISOString(),
      orderItems,
    });
    orderIdCounter++;
  }

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 14);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 14);
  let historyIdCounter = 1;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    for (let i = 0; i < faker.number.int({ min: 0, max: 5 }); i++) {
      const orderItems = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => {
        const randomMenuItemId = String(faker.number.int({ min: 1, max: menuItemId - 1 }));
        const menuItem = data.menuItems.find((item) => item.id === randomMenuItemId);
        return {
          id: `historyItem${historyIdCounter}${i}`,
          orderId: `history${historyIdCounter}`,
          menuItemId: randomMenuItemId,
          quantity: faker.number.int({ min: 1, max: 3 }),
          price: menuItem.price,
        };
      }).filter((item) => item !== null); // Remove null items

      const createdAt = faker.date.between({
        from: d,
        to: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
      });
      const servedAt = faker.date
        .between({ from: createdAt, to: new Date(createdAt.getTime() + 30 * 60000) })
        .toISOString();
      const completedAt = faker.date
        .between({ from: servedAt, to: new Date(new Date(servedAt).getTime() + 60 * 60000) })
        .toISOString();
      const cashierId = faker.helpers.arrayElement(
        data.users.filter((u) => u.role === 'cashier').map((u) => u.id),
      );

      data.orderHistory.push({
        id: `history${historyIdCounter}`,
        orderId: `history${historyIdCounter}`,
        tableId: String(faker.number.int({ min: 1, max: tableId - 1 })),
        paymentMethod: faker.helpers.arrayElement(['cash', 'online payment']),
        createdAt: createdAt.toISOString(),
        servedAt,
        completedAt,
        orderItems,
        cashierId,
      });
      historyIdCounter++;
    }
  }

  for (let i = 0; i < 25; i++) {
    const rating = faker.number.int({ min: 1, max: 5 });
    const comment =
      rating > 3 ? faker.lorem.sentence() : faker.datatype.boolean() ? faker.lorem.sentence() : '';
    data.feedback.push({
      id: faker.database.mongodbObjectId(),
      rating,
      comment,
      timestamp: faker.date.soon().toISOString(),
    });
  }

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0];
    let totalOrders = 0,
      totalRevenue = 0,
      paymentMethodSummary = {},
      ordersByHour = {},
      bestSellingItems = {};
    data.orderHistory
      .filter((order) => order.createdAt.startsWith(dateString))
      .forEach((order) => {
        totalOrders++;
        order.orderItems.forEach((item) => {
          totalRevenue += item.quantity * parseFloat(item.price);
          const menuItem = data.menuItems.find((mi) => mi.id === item.menuItemId);
          if (menuItem)
            bestSellingItems[menuItem.name] =
              (bestSellingItems[menuItem.name] || 0) + item.quantity;
        });
        if (order.paymentMethod)
          paymentMethodSummary[order.paymentMethod] =
            (paymentMethodSummary[order.paymentMethod] || 0) + 1;
        const hour = order.createdAt.split('T')[1].split(':')[0];
        ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
      });

    const sortedBestSellingItems = Object.entries(bestSellingItems)
      .sort(([, qA], [, qB]) => qB - qA)
      .slice(0, 5)
      .reduce((obj, [name, quantity]) => ((obj[name] = quantity), obj), {});
    const ratings = data.feedback
      .filter((f) => f.timestamp.startsWith(dateString))
      .map((f) => f.rating);
    const averageRating =
      ratings.length > 0
        ? parseFloat((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2))
        : 0;
    const totalComments = data.feedback.filter(
      (f) => f.timestamp.startsWith(dateString) && f.comment !== '',
    ).length;
    data.statistics.push({
      id: `stats${dateString}`,
      date: dateString,
      totalOrders,
      totalRevenue,
      paymentMethodSummary,
      ordersByHour,
      averageRating,
      totalComments,
      bestSellingItems: sortedBestSellingItems,
    });
  }

  return data;
}

const jsonData = generateData();
fs.writeFileSync('db.json', JSON.stringify(jsonData, null, 2));
console.log('Generated db.json');
