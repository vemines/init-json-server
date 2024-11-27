const jsonServer = require('@wll8/json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Set default middlewares (e.g. logger, static, CORS)
server.use(middlewares);

const getDateString = () => new Date(Date.now()).toISOString();

server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
  if (req.method === 'POST') {
    req.body.createdAt = getDateString();
    req.body.updatedAt = getDateString();
  } else if (req.method === 'PATCH' || req.method === 'PUT') {
    req.body.updatedAt = getDateString();
  }

  // Continue to JSON Server router
  next();
});

// Custom output for LIST with pagination
router.render = (req, res) => {
  // Check GET with pagination
  const headers = res.getHeaders();
  const totalCountHeader = headers['x-total-count'];
  const link = headers['link'];

  if (req.method === 'GET' && totalCountHeader && link) {
    const queryParams = req._parsedUrl.query;
    const queryObject = Object.fromEntries(new URLSearchParams(queryParams));

    const result = {
      data: res.locals.data,
      pagination: {
        _page: Number.parseInt(queryObject._page) || 1,
        _limit: Number.parseInt(queryObject._limit) || 10,
        _totalRows: Number.parseInt(totalCountHeader),
      },
      links: parseLink(link),
    };

    return res.jsonp(result);
  }

  // Otherwise, keep default behavior
  res.jsonp(res.locals.data);
};

// Use the default router for CRUD operations
server.use('/api/v1', router);

// Start the server
server.listen(3000, () => {
  console.log('JSON Server is running on http://localhost:3000');
});

function parseLink(s) {
  const links = s
    .split(',')
    .map((link) => {
      const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        return { url: match[1], rel: match[2] };
      }
      return null;
    })
    .filter(Boolean);

  // Convert array of links into a key-value map
  return links.reduce((acc, { rel, url }) => {
    acc[rel] = url;
    return acc;
  }, {});
}
