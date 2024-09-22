// amazon-api.js
import { DefaultApi, GetItemsRequest } from 'amazon-paapi';
import config from './paapi-config';

const api = new DefaultApi(config);

const searchItems = async (isbn) => {
  const request = new GetItemsRequest({
    ItemIds: [isbn],
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
    ],
  });

  try {
    const response = await api.getItems(request);
    if (
      response.ItemsResult &&
      response.ItemsResult.Items &&
      response.ItemsResult.Items.length > 0
    ) {
      const item = response.ItemsResult.Items[0];
      return {
        name: item.ItemInfo.Title.DisplayValue,
        author: item.ItemInfo.ByLineInfo.Contributors[0].Name,
        isbn: isbn,
        imageUrl: item.Images.Primary.Large.URL,
      };
    } else {
      throw new Error('No items found');
    }
  } catch (error) {
    console.error('Error fetching item from PAAPI:', error);
    throw error;
  }
};

export default searchItems;
