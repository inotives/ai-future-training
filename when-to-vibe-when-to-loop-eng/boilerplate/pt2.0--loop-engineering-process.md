- Past this prompt to agent:

> Use the trinary-agents skill and work with me on the next part. you will first look at the current codebase which is mostly Mock-UI, we will need to bind these mock ui to the actual data. First we will need a backend pipeline to ingest the data from nea api into our sqlite db, then use those data to serve the mock ui via a fastapi server to update the each ui element. Do take note about the backfilling of the data when the server is close or down, we will need to backfill them from nea-api to make sure there are not data gap. Need to take note of the NEA rate limiting for the api as well. We will also add a auto-refresh on/off button at the top right corner which will try to refresh latest data from nea into db then update the ui


- Then you just need to follow the Q & A by agent until the plan is created. 
- Read the plan and approved it if no issue 
- Trinary agent PM will breakdown the plan to multiple tasks, if no issue, approved the plan
- Trinary agent will start the whole looping until all task finsh. You can view the progress by using the dashboard.html inside the feature folder. 
