# BTC Price Prediction Game - Developer Test

## Overview
A Nuxt 4 application where players guess if the BTC price will go up or down.

## Game Rules

1. **Score Display**: Player can always see their current score and latest BTC price in USD
2. **Guessing**: Player can choose "up" or "down"
3. **Locked State**: After guessing, no new guesses until the current one is resolved
4. **Resolution Conditions**: 
   - Price must change from the guess price
   - At least 60 seconds must pass since the guess was made
5. **Scoring**:
   - Correct guess (up = price went higher, down = price went lower) → +1 point
   - Incorrect guess → -1 point
6. **Persistence**: Players can close browser and return to see score and continue playing
7. **Single Guess**: Only one active guess at a time
8. **Starting Score**: New players start with 0 points

## Technical Requirements

- **Price Data**: Use any 3rd party BTC price API (e.g., CoinGecko, Binance, Coinbase)
- **Data Persistence**: Store player scores in a backend data store (AWS preferred)
- **Framework**: Nuxt 4

## Notes

- Fair resolution using real BTC price data
- Handle edge cases (price unchanged after 60s, API failures, etc.)
