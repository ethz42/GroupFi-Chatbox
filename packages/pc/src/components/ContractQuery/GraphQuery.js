import { request, gql } from 'graphql-request';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const graph_api_key = process.env.GRAPH_API_KEY;

const endpoint = `https://gateway.thegraph.com/api/${graph_api_key}/subgraphs/id/J4XbkvmPeCwBstAGXFwvWih4TFfmcp5xbmpXLaNeSBtp`;


const cutoffDate = new Date();
// last 5 years
cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

async function getTokenCount() {
  const query = `{
    events(orderBy: tokenCount, orderDirection: desc, first: 3, where: { created_gte: ${cutoffTimestamp} }) {
      id
      created
      tokenCount
      tokens {
        id
      }
    }
  }
  `;

  try {
    const data = await request(endpoint, query);
    console.log(data);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchTokenIdsByEventIds(eventIds) {
  const query = `
    query ($eventIds: [String!]!) {
      tokens(where: { event_in: $eventIds }) {
        id
        owner {
          id
        }
        event {
          id
        }
      }
    }
  `;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { eventIds },
    }),
  });

  const data = await response.json();

  // Group tokens by event ID
  const tokensByEvent = data.data.tokens.reduce((acc, token) => {
    const eventId = token.event.id;
    if (!acc[eventId]) {
      acc[eventId] = {tokenId: [], walletAddresses: []};
    }
    acc[eventId].tokenId.push(token.id);
    acc[eventId].walletAddresses.push(token.owner.id);
    return acc;
  }, {});

  return tokensByEvent;
}

// Example usage
const eventIds = ["10", "11"];

fetchTokenIdsByEventIds(eventIds)
  .then((tokensByEvent) => console.log(tokensByEvent))
  .catch((error) => console.error('Error:', error));
