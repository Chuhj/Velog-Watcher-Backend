import express from 'express';
import Parser from 'rss-parser';
import cors from 'cors';
import puppeteer from 'puppeteer';

const port = process.env.PORT || 3000;
const app = express();
const parser = new Parser();

app.use(
  cors({
    origin: 'https://velog.io',
  })
);
app.use(express.json());

app.post('/posts', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      throw new Error('Username is required.');
    }

    const followings = await getFollowings(username);
    const urls = followings.map(
      (following) => `https://v2.velog.io/rss/${following}`
    );
    const feedItems = await fetchAllRssFeedItems(urls);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentFeedItems = feedItems.filter((item) => {
      const itemTime = new Date(item.isoDate);
      return itemTime > oneWeekAgo;
    });

    const sortedRecentFeedItems = sortByRecent(recentFeedItems);

    res.send(sortedRecentFeedItems);
  } catch (error) {
    console.log('/posts error:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

function sortByRecent(items) {
  return items.sort((a, b) => Date.parse(b?.isoDate) - Date.parse(a?.isoDate));
}

async function getFollowings(username) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`https://velog.io/@${username}/followings`);
    await page.waitForFunction(
      () => document.querySelector('[class*="Skeleton"]') === null
    );

    const followings = await page.$$eval(
      '.VelogFollowItem_username__70qo_',
      (elements) => elements.map((e) => e.textContent?.slice(1))
    );

    return followings;
  } catch (error) {
    console.log(`getFollowings() error: ${error}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function fetchAllRssFeedItems(urls) {
  try {
    const results = await Promise.all(
      urls.map((url) => fetchRssFeedItems(url))
    );
    return results.flat();
  } catch (error) {
    console.log(`fetchAllRssFeedItems() error: ${error}`);
    throw error;
  }
}

async function fetchRssFeedItems(url) {
  try {
    const rssFeed = await parser.parseURL(url);

    const feedItems = rssFeed.items.map((item) => {
      return {
        feedTitle: rssFeed.title,
        profileImage: rssFeed.image.url,
        title: item.title,
        isoDate: item.isoDate,
        link: item.link,
      };
    });

    return feedItems;
  } catch (error) {
    console.log(`fetchRssFeedItems() 에러: ${error}`);
    throw error;
  }
}


app.listen(port, () => console.log(`listening at ${port}`));
