const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const csvParser = require('csv-parser');
const mongoose = require('mongoose');

const Agent = require('./Models/Agent');
const User = require('./Models/User');
const Account = require('./Models/Account');
const Lob = require('./Models/Lob');
const Carrier = require('./Models/Carrier');
const Policy = require('./Models/Policy');

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const { filePath, originalName } = workerData;
  const ext = path.extname(originalName).toLowerCase();

  let rows = [];

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  } else if (ext === '.csv') {
    rows = await readCsv(filePath);
  } else {
    throw new Error('Unsupported file type: ' + ext);
  }

  for (const row of rows) {
    try {
      let agentDoc = null;
      if (row.agent) {
        agentDoc = await Agent.findOneAndUpdate(
          { agent: row.agent },
          { agent: row.agent },
          { upsert: true, new: true }
        );
      }

      const userData = {
        firstname: row.firstname,
        dob: row.dob ? row.dob : null,
        address: row.address,
        phone: row.phone,
        state: row.state,
        zip: row.zip,
        email: row.email,
        gender: row.gender,
        userType: row.userType
      };
      let userDoc = await User.findOne({ email: userData.email });
      if (!userDoc) userDoc = await User.create(userData);

      let accountDoc = null;
      if (row.account_name) {
        accountDoc = await Account.findOneAndUpdate(
          { account_name: row.account_name },
          { account_name: row.account_name, user: userDoc._id },
          { upsert: true, new: true }
        );
      }

      let lobDoc = null;
      if (row.category_name) {
        const name = row.category_name;
        lobDoc = await Lob.findOneAndUpdate(
          { category_name: name },
          { category_name: name },
          { upsert: true, new: true }
        );
      }

      let carrierDoc = null;
      if (row.company_name) {
        const cname = row.company_name;
        carrierDoc = await Carrier.findOneAndUpdate(
          { company_name: cname },
          { company_name: cname },
          { upsert: true, new: true }
        );
      }

      const policyData = {
        policy_number: row.policy_number ,
        start_date: row.policy_start_date ? row.policy_start_date : null,
        end_date: row.policy_end_date ? row.policy_end_date : null,
        policy_category_collection_id: lobDoc ? lobDoc._id : null,
        company_collection_id: carrierDoc ? carrierDoc._id : null,
        user: userDoc ? userDoc._id : null,
        account: accountDoc ? accountDoc._id : null,
        agent: agentDoc ? agentDoc._id : null
      };
      if (policyData.policy_number) {
        await Policy.findOneAndUpdate(
          { policy_number: policyData.policy_number },
          policyData,
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      console.error('Row insert error:', e);
    }
  }


  parentPort.postMessage({ status: 'done', rows: rows.length });
  process.exit(0);
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

main().catch(err => {
  parentPort.postMessage({ error: err.message });
  console.error(err);
  process.exit(1);
});
