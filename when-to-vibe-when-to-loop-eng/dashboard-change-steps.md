# Dashboard changes after the initial prompt

1. **Extend recent trends to 24 hours.** Show one hourly point for each hour and keep missing readings visible as gaps.
2. **Add a seven-day hourly profile to region detail.** For the selected region, average readings by Singapore clock hour across the synthetic seven-day fixture. Show separate PSI and PM2.5 rankings, sorted from highest average to lowest, with the available sample count out of seven.
3. **Add map hover details.** Hovering a region marker shows the latest PSI and PM2.5 readings with their timestamps. Keep the click popup for touch interaction.
4. **Color regional indicators by PSI severity.** Apply the category color to the small dot in “Latest by regions” and to each map marker, with a legend:
   - 0–100: Good to Moderate
   - 101–200: Unhealthy
   - 201–300: Very Unhealthy
   - 301 and above: Hazardous
5. **Make the regional list more visually prominent.** Add a subtle Singapore cityscape background and severity-tinted row backgrounds while keeping the readings legible.
6. **Theme region detail by selected-region severity.** When a region is selected, update the detail panel’s accent colors and category label to match that region’s PSI category.

All readings and the background illustration are synthetic demo content. The dashboard does not report current conditions or confirm a haze event.
