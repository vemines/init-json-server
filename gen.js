const { faker } = require('@faker-js/faker');
const fs = require('fs');

// Generate an array of fake posts
const generatePosts = (numPosts) => {
  const posts = [];

  for (let i = 0; i < numPosts; i++) {
    posts.push({
      id: i + 1, // Simple incremental ID
      title: faker.lorem.sentence(), // Random title
      body: faker.lorem.paragraphs(), // Random body content
      author: faker.internet.username(), // Random author name
      createdAt: faker.date.past(), // Random creation date
    });
  }

  return posts;
};

// Create the db.json object
const db = {
  posts: generatePosts(50),
};

// Write the generated data to a db.json file
fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf-8');

console.log('db.json file has been generated');
