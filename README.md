# 🧾 Policy Management API (Node.js + MongoDB)

A full-featured Node.js backend project that manages insurance policy data.  
It supports uploading large XLSX/CSV files (using **worker threads**), searching and aggregating policies, scheduling messages, and monitoring CPU usage to automatically restart the server when utilization exceeds 70%.

---

## 🚀 Features

✅ **File Upload & Data Import**
- Upload `.xlsx` or `.csv` files to populate multiple MongoDB collections.  
- Parsing runs in a **worker thread** to keep the server responsive.

✅ **Separate MongoDB Collections**
- `Agent`, `User`, `Account`, `LOB`, `Carrier`, `Policy`, `Message`, `ScheduledMessage`.

✅ **Search & Aggregation APIs**
- Search policy by **username**.
- Aggregate policy data by **user**.

✅ **Server CPU Monitoring**
- Tracks real-time CPU utilization using **pidusage**.
- Automatically restarts the worker process when CPU usage > 70%.

✅ **Message Scheduler**
- Schedule a message to be inserted into MongoDB at a specific **day/time** using **node-schedule**.
- Automatically reloads and reschedules pending messages on restart.
