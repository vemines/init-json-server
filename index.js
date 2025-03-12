// --- FILE index.js ---
const jsonServer = require('@wll8/json-server');
const moment = require('moment');
const { faker } = require('@faker-js/faker');

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// --- Helper Functions ---

// Check if user is admin.
function isAdmin(req) {
  const db = router.db;
  const userId = req.headers.userid;
  if (!userId) return false;
  const user = db.get('users').find({ id: userId }).value();
  return user && user.role === 'admin';
}

// Check if user has a specific role.
function hasRole(req, roles) {
  const db = router.db;
  const userId = req.headers.userid;
  if (!userId) return false;
  const user = db.get('users').find({ id: userId }).value();
  return user && roles.includes(user.role);
}

// Update daily statistics.
function updateStatistics(db, order) {
  const today = new Date().toISOString().split('T')[0];
  let stats = db.get('statistics').find({ date: today }).value();

  if (!stats) {
    stats = {
      id: `stats-${today}`,
      date: today,
      totalOrders: 0,
      totalRevenue: 0,
      paymentMethodSummary: { cash: 0, 'online payment': 0 },
      ordersByHour: Array(24).fill(0),
      bestSellingItems: {},
      averageRating: 0,
      totalComments: 0,
    };
    db.get('statistics').push(stats).write();
  }

  stats.totalOrders += 1;

  let orderTotal = 0;
  order.orderItems.forEach((item) => {
    const menuItem = db.get('menuItems').find({ id: item.menuItemId }).value();
    orderTotal += menuItem.price * item.quantity;
  });

  stats.totalRevenue += orderTotal;
  stats.paymentMethodSummary[order.paymentMethod] =
    (stats.paymentMethodSummary[order.paymentMethod] || 0) + 1;
  const hour = new Date(order.completedAt).getHours();

  if (!stats.ordersByHour) {
    stats.ordersByHour = Array(24).fill(0);
  }
  stats.ordersByHour[hour] = (stats.ordersByHour[hour] || 0) + 1;

  order.orderItems.forEach((item) => {
    const menuItem = db.get('menuItems').find({ id: item.menuItemId }).value();
    if (menuItem) {
      const name = menuItem.name;
      stats.bestSellingItems[name] = (stats.bestSellingItems[name] || 0) + item.quantity;
    }
  });
  db.get('statistics').find({ date: today }).assign(stats).write();
}

// Perform monthly rollover.
function performMonthlyRollover() {
  const db = router.db;
  const now = moment();
  const currentMonth = now.format('YYYY-MM');
  const lastMonth = now.clone().subtract(1, 'month').format('YYYY-MM');

  // Archive previous month
  const lastMonthStats = db
    .get('statistics')
    .filter((stat) => moment(stat.date).format('YYYY-MM') === lastMonth)
    .value();

  if (lastMonthStats.length > 0) {
    const aggregatedStatsLastMonth = {
      id: lastMonth,
      year: parseInt(lastMonth.split('-')[0]),
      month: parseInt(lastMonth.split('-')[1]),
      totalOrders: lastMonthStats.reduce((sum, s) => sum + s.totalOrders, 0),
      totalRevenue: lastMonthStats.reduce((sum, s) => sum + s.totalRevenue, 0),
      paymentMethodSummary: {},
      averageRating: 0,
      totalComments: lastMonthStats.reduce((sum, s) => sum + s.totalComments, 0),
      bestSellingItems: {},
    };

    lastMonthStats.forEach((stat) => {
      for (const method in stat.paymentMethodSummary) {
        aggregatedStatsLastMonth.paymentMethodSummary[method] =
          (aggregatedStatsLastMonth.paymentMethodSummary[method] || 0) +
          stat.paymentMethodSummary[method];
      }
      for (const item in stat.bestSellingItems) {
        aggregatedStatsLastMonth.bestSellingItems[item] =
          (aggregatedStatsLastMonth.bestSellingItems[item] || 0) + stat.bestSellingItems[item];
      }
    });

    const allRatings = lastMonthStats
      .map((stat) => stat.averageRating)
      .filter((rating) => rating > 0);
    if (allRatings.length > 0) {
      aggregatedStatsLastMonth.averageRating =
        allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    }

    db.get('aggregatedStatistics').push(aggregatedStatsLastMonth).write();
    const currentMonthStats = db
      .get('statistics')
      .filter((stat) => moment(stat.date).format('YYYY-MM') === currentMonth)
      .value();
    db.set('statistics', currentMonthStats).write(); // Keep only current month
  }

  // Update/Create current month
  const currentMonthStats = db
    .get('statistics')
    .filter((stat) => moment(stat.date).format('YYYY-MM') === currentMonth)
    .value();

  if (currentMonthStats.length > 0) {
    const aggregatedStatsCurrentMonth = {
      id: currentMonth,
      year: parseInt(currentMonth.split('-')[0]),
      month: parseInt(currentMonth.split('-')[1]),
      totalOrders: currentMonthStats.reduce((sum, s) => sum + s.totalOrders, 0),
      totalRevenue: currentMonthStats.reduce((sum, s) => sum + s.totalRevenue, 0),
      paymentMethodSummary: {},
      averageRating: 0,
      totalComments: currentMonthStats.reduce((sum, s) => sum + s.totalComments, 0),
      bestSellingItems: {},
    };

    currentMonthStats.forEach((stat) => {
      for (const method in stat.paymentMethodSummary) {
        aggregatedStatsCurrentMonth.paymentMethodSummary[method] =
          (aggregatedStatsCurrentMonth.paymentMethodSummary[method] || 0) +
          stat.paymentMethodSummary[method];
      }
      for (const item in stat.bestSellingItems) {
        aggregatedStatsCurrentMonth.bestSellingItems[item] =
          (aggregatedStatsCurrentMonth.bestSellingItems[item] || 0) + stat.bestSellingItems[item];
      }
    });

    const allRatings = currentMonthStats
      .map((stat) => stat.averageRating)
      .filter((rating) => rating > 0);

    if (allRatings.length > 0) {
      aggregatedStatsCurrentMonth.averageRating =
        allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    }

    const existingCurrentMonthEntry = db
      .get('aggregatedStatistics')
      .find({ id: currentMonth })
      .value();

    if (existingCurrentMonthEntry) {
      db.get('aggregatedStatistics')
        .find({ id: currentMonth })
        .assign(aggregatedStatsCurrentMonth)
        .write();
    } else {
      db.get('aggregatedStatistics').push(aggregatedStatsCurrentMonth).write();
    }
  }
}

// --- Authentication ---

server.post('/login', (req, res) => {
  const db = router.db;
  const { username, password } = req.body;
  const user = db.get('users').find({ username, password }).value();

  if (user) {
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// --- Authorization Middleware ---

// Protect routes requiring authentication.
server.use((req, res, next) => {
  const excludedPaths = ['/login', '/feedback'];
  const isExcluded = excludedPaths.some(
    (path) =>
      (req.path.startsWith(path) && req.method === 'POST') ||
      (req.path === path && req.method === 'GET'),
  );
  if (isExcluded) {
    next();
    return;
  }
  const publicGetPaths = [
    '/categories',
    '/subCategories',
    '/menuItems',
    '/areaTables',
    '/tables',
    '/areas-with-tables',
    '/feedback',
  ];
  const isPublicGet = publicGetPaths.some(
    (path) =>
      (req.path.startsWith(path) && req.method === 'GET') ||
      (req.path === path && req.method === 'GET'),
  );
  if (isPublicGet) {
    next(); // Allow public GET requests
    return;
  }

  if (req.headers.userid) {
    next(); // Authenticated, proceed
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// --- Users (Admin Only) ---
server.use('/users', (req, res, next) => {
  if (req.method !== 'GET' && !isAdmin(req)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

// --- Menu (Admin Only for Create/Update/Delete) ---
server.use(['/categories', '/subCategories', '/menuItems'], (req, res, next) => {
  if (req.method !== 'GET' && !isAdmin(req)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

// --- Tables (Admin Only for Create/Update/Delete) ---
server.use(['/areaTables', '/tables'], (req, res, next) => {
  if (req.method !== 'GET' && !isAdmin(req)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

// Get all table statuses, aggregated by area.
server.get('/areas-with-tables', (req, res) => {
  const db = router.db;
  const areas = db.get('areaTables').value();

  const areasWithTables = areas.map((area) => {
    const tables = db.get('tables').filter({ areaId: area.id }).value();
    return {
      ...area, // Include all area properties
      tables: tables, // Add the tables array
    };
  });

  res.json(areasWithTables);
});

// --- Orders ---

// Create a new order (Server/Admin).
server.post('/orders', (req, res) => {
  const db = router.db;
  const userId = req.headers.userid;

  if (!hasRole(req, ['serve', 'admin'])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const newOrder = req.body;

  const tableExists = db.get('tables').find({ id: newOrder.tableId }).value();
  if (!tableExists) {
    return res.status(400).json({ message: 'Invalid table ID' });
  }

  for (const item of newOrder.orderItems) {
    const menuItem = db.get('menuItems').find({ id: item.menuItemId }).value();
    if (!menuItem) {
      return res.status(400).json({ message: `Invalid menu item ID: ${item.menuItemId}` });
    }
  }

  newOrder.id = faker.database.mongodbObjectId();
  newOrder.timestamp = new Date().toISOString();
  newOrder.orderStatus = 'new';
  newOrder.createdBy = userId;
  newOrder.createdAt = new Date().toISOString();
  newOrder.orderItems = newOrder.orderItems.map((item) => ({
    ...item,
    id: `orderItem-${newOrder.id}-${item.menuItemId}`,
    orderId: newOrder.id,
  }));

  db.get('orders').push(newOrder).write();
  res.status(201).json(newOrder);
});

// Get today's orders.
server.get('/orders', (req, res) => {
  const db = router.db;
  const today = moment().startOf('day').toISOString();
  const orders = db
    .get('orders')
    .filter((order) => moment(order.timestamp).isSameOrAfter(today))
    .value();

  res.json(orders);
});

// Update order status (Server: served, Cashier: completed).
server.patch('/orders/:id', (req, res) => {
  const db = router.db;
  const userId = req.headers.userid;
  const order = db.get('orders').find({ id: req.params.id }).value();
  const updatedOrder = req.body;

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const user = db.get('users').find({ id: userId }).value();

  if (updatedOrder.orderStatus === 'served' && hasRole(req, ['serve', 'admin'])) {
    order.orderStatus = 'served';
    order.servedBy = userId;
    order.servedAt = new Date().toISOString();
    db.get('orders').find({ id: req.params.id }).assign(order).write();
    return res.json(order);
  } else if (updatedOrder.orderStatus === 'completed' && hasRole(req, ['cashier', 'admin'])) {
    if (
      !updatedOrder.paymentMethod ||
      !['cash', 'online payment'].includes(updatedOrder.paymentMethod)
    ) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    let totalPrice = 0;
    order.orderItems.forEach((item) => {
      const menuItem = db.get('menuItems').find({ id: item.menuItemId }).value();
      totalPrice += menuItem.price * item.quantity;
    });

    updatedOrder.completedAt = new Date().toISOString();
    updatedOrder.cashierId = userId;
    const completedOrder = {
      ...order,
      ...updatedOrder,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
    };

    db.get('orderHistory')
      .push({
        ...completedOrder,
        orderId: completedOrder.id,
        id: `history-${completedOrder.id}`,
      })
      .write();

    db.get('orders').remove({ id: req.params.id }).write();
    updateStatistics(db, completedOrder);
    performMonthlyRollover();
    return res.json(completedOrder);
  } else {
    return res.status(403).json({ message: 'Forbidden' });
  }
});

// --- Feedback ---
server.post('/feedback', (req, res) => {
  const db = router.db;
  const newFeedback = {
    ...req.body,
    id: faker.datatype.uuid(),
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.get('feedback').push(newFeedback).write();
  res.status(201).json(newFeedback);
});
// --- Statistics ---

// Get current month's daily statistics.
server.get('/statistics', (req, res) => {
  const db = router.db;
  const currentMonth = moment().format('YYYY-MM');
  const stats = db
    .get('statistics')
    .filter((stat) => moment(stat.date).format('YYYY-MM') === currentMonth)
    .value();
  res.json(stats);
});

// Get today's statistics.
server.get('/statistics/today', (req, res) => {
  const db = router.db;
  const today = moment().format('YYYY-MM-DD');
  const stats = db.get('statistics').find({ date: today }).value();

  if (!stats) {
    return res.status(404).json({ message: 'Statistics not found for today.' });
  }

  res.json(stats);
});

// Get this week's statistics (today + 6 previous days).
server.get('/statistics/this-week', (req, res) => {
  const db = router.db;
  const today = moment();
  const weekStats = [];

  for (let i = 0; i < 7; i++) {
    const date = today.clone().subtract(i, 'days').format('YYYY-MM-DD');
    const stats = db.get('statistics').find({ date: date }).value();
    if (stats) {
      weekStats.push(stats);
    }
  }

  res.json(weekStats);
});

// Get all monthly statistics.
server.get('/aggregatedStatistics', (req, res) => {
  const db = router.db;
  const monthlyStats = db.get('aggregatedStatistics').value();
  if (!monthlyStats || !Array.isArray(monthlyStats)) {
    return res.json([]);
  }
  res.json(monthlyStats);
});

// Get yearly statistics (dynamically calculated).
server.get('/statisticsYears', (req, res) => {
  const db = router.db;
  const monthlyStats = db.get('aggregatedStatistics').value();

  if (!monthlyStats || monthlyStats.length === 0) {
    return res.json([]);
  }

  const yearlyData = {};
  monthlyStats.forEach((month) => {
    if (month.month != null) {
      const year = month.year.toString();
      if (!yearlyData[year]) {
        yearlyData[year] = {
          id: year,
          year: parseInt(year),
          month: null,
          totalOrders: 0,
          totalRevenue: 0,
          paymentMethodSummary: {},
          averageRating: [],
          totalComments: 0,
          bestSellingItems: {},
        };
      }

      yearlyData[year].totalOrders += month.totalOrders;
      yearlyData[year].totalRevenue += month.totalRevenue;
      yearlyData[year].totalComments += month.totalComments;

      for (const method in month.paymentMethodSummary) {
        yearlyData[year].paymentMethodSummary[method] =
          (yearlyData[year].paymentMethodSummary[method] || 0) + month.paymentMethodSummary[method];
      }
      for (const item in month.bestSellingItems) {
        yearlyData[year].bestSellingItems[item] =
          (yearlyData[year].bestSellingItems[item] || 0) + month.bestSellingItems[item];
      }
      if (month.averageRating > 0) {
        yearlyData[year].averageRating.push(month.averageRating);
      }
    }
  });

  for (const year in yearlyData) {
    if (yearlyData[year].averageRating.length > 0) {
      const sum = yearlyData[year].averageRating.reduce((a, b) => a + b, 0);
      yearlyData[year].averageRating = parseFloat(
        (sum / yearlyData[year].averageRating.length).toFixed(1),
      );
    } else {
      yearlyData[year].averageRating = 0;
    }
  }
  const yearlyArray = Object.values(yearlyData);
  res.json(yearlyArray);
});

// --- Default Routes (CRUD) ---
server.use(router);

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`);
});
