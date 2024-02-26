import express from 'express';
import Parser from 'rss-parser';
import cors from 'cors';

const port = process.env.PORT || 3000;
const app = express();
const parser = new Parser();

app.use(
  cors({
    origin: 'https://velog.io',
  })
);
app.use(express.json());

async function fetchRssFeedItems(url) {
  try {
    const rssFeed = await parser.parseURL(url);

    const feedItems = rssFeed.items.map((item) => {
      return {
        feedTitle: rssFeed.title,
        profileImage: rssFeed.image.url,
        isoDate: item.isoDate,
        link: item.link,
      };
    });

    return feedItems;
  } catch (error) {
    console.log(error);
    return [];
  }
}

function sortByRecent(items) {
  return items.sort((a, b) => Date.parse(b?.isoDate) - Date.parse(a?.isoDate));
}

async function fetchAllRssFeedItems(urls) {
  try {
    const results = await Promise.all(
      urls.map((url) => fetchRssFeedItems(url))
    );
    return results.flat();
  } catch (error) {
    console.log(error);
    return [];
  }
}

app.post('/posts', async (req, res) => {
  const urls = [];
  const feedItems = await fetchAllRssFeedItems(urls);
  res.send(sortByRecent(feedItems));
});

app.listen(port, () => console.log(`listening at ${port}`));
