const { sleep, tryCatchExpect } = require("./helpers");

const fetch = require("node-fetch");
const snaxjs = require("@snaxfoundation/snaxjs");

const { promisify } = require("util");
const child_process = require("child_process");

const [exec, execFile, spawn] = [child_process.exec, child_process.execFile]
  .map(promisify)
  .concat(child_process.spawn);
const { TextDecoder, TextEncoder } = require("text-encoding");

const rpc = new snaxjs.JsonRpc(
  process.env.SNAXNODE || "http://127.0.0.1:8888",
  {
    fetch
  }
);

let account;

const signatureProvider = new snaxjs.JsSignatureProvider([
  "5HvtgZn4wf4vNAe3nRb9vjYfLqvasemsSQckVHxmdAeBRbdPURs",
  "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3",
  "5JD9AGTuTeD5BXZwGQ5AtwBqHK21aHmYnTetHgk1B3pjj7krT8N",
  "5JcWXD3XkpEYbwiVK9Pd3X5bLxLkaUkkJiST3Y9iA4wFrTeyeVL",
  "5JLYkoKuNXGGvUtzjRnP8DqUwt7xny3YGVaDpeqFDdCJKBoBkNC",
  "5JRjkPFeRVGMRLaAa5gkGiC2acf8KT4NkAw1SZ5R7S1gvcCawZh"
]);
const api = new snaxjs.Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
});

jest.setTimeout(1e6);

describe("Platform", async () => {
  beforeEach(async () => {
    spawn("./setup_platform.sh", [], {
      detached: true,
      stdio: "ignore"
    });
    await sleep(6e3);
    account = "platform";
  });

  const verifyStatesAndAccounts = async () => {
    const [state, states, accounts, users] = await Promise.all([
      api.rpc.get_table_rows({
        code: account,
        scope: account,
        table: "state"
      }),
      api.rpc.get_table_rows({
        code: account,
        scope: account,
        table: "states"
      }),
      api.rpc.get_table_rows({
        code: account,
        scope: account,
        table: "paccounts"
      }),
      api.rpc.get_table_rows({
        code: account,
        scope: account,
        table: "pusers"
      })
    ]);
    expect(state).toMatchSnapshot();
    expect(states).toMatchSnapshot();
    expect(accounts.rows.map(({ created, ...row }) => row)).toMatchSnapshot();
    expect(users).toMatchSnapshot();
  };

  const verifyTransferTable = async currency => {
    expect(
      await api.rpc.get_table_rows({
        code: account,
        scope: currency,
        table: "transfers"
      })
    ).toMatchSnapshot();
  };

  const verifyAccountsBalances = async accounts => {
    const tables = await Promise.all(
      accounts.map(account =>
        api.rpc.get_table_rows({
          code: "snax.token",
          scope: account,
          table: "accounts"
        })
      )
    );
    expect(tables).toMatchSnapshot();
  };

  const initialize = async () => {
    await api.transact(
      {
        actions: [
          {
            account,
            name: "initialize",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              name: "test_platform",
              token_dealer: "snax",
              token_symbol_str: "SNAX",
              precision: 4,
              airdrop: ""
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
  };

  const addUser = accountObj =>
    api.transact(
      {
        actions: [
          {
            account,
            name: "addaccount",
            authorization: [
              {
                actor: account,
                permission: "active"
              },
              {
                actor: "snax.airdrop",
                permission: "active"
              },
              {
                actor: "snax.transf",
                permission: "active"
              }
            ],
            data: {
              creator: account,
              ...accountObj
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const newUser = accountObj =>
    api.transact(
      {
        actions: [
          {
            account: "snax.creator",
            name: "newaccount",
            authorization: [
              {
                actor: "snax.creator",
                permission: "active"
              }
            ],
            data: {
              ...accountObj
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const socialTransfer = (from, to, quantity, memo) =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "transfersoc",
            authorization: [
              {
                actor: from,
                permission: "active"
              }
            ],
            data: {
              from,
              to,
              quantity,
              memo
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const lockArUpdate = () =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "lockarupdate",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {}
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const activate = id =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "activate",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              id
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
  const deactivate = id =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "deactivate",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              id
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
  const lockUpdate = () =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "lockupdate",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {}
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const updateAttentionRate = accountObj =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "updatear",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              ...accountObj,
              add_account_if_not_exist: false
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const updateAttentionRateOrCreate = accountObj =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "updatear",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              ...accountObj,
              add_account_if_not_exist: true
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const updateAttentionRateMulti = updates =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "updatearmult",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: { updates, add_account_if_not_exist: false }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const updateAttentionRateMultiOrCreate = updates =>
    api.transact(
      {
        actions: [
          {
            account: account,
            name: "updatearmult",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: { updates, add_account_if_not_exist: true }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const addSymbol = symbol =>
    api.transact(
      {
        actions: [
          {
            account: "platform",
            name: "addsymbol",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: { token_symbol_str: symbol, precision: 4 }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const addCreator = name =>
    api.transact(
      {
        actions: [
          {
            account: "platform",
            name: "addcreator",
            authorization: [
              {
                actor: "platform",
                permission: "active"
              }
            ],
            data: { name }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  const dropAccount = id =>
    api.transact(
      {
        actions: [
          {
            account: "platform",
            name: "dropaccount",
            authorization: [
              {
                actor: "platform",
                permission: "active"
              }
            ],
            data: { initiator: "platform", id }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
  const dropUser = id =>
    api.transact(
      {
        actions: [
          {
            account: "platform",
            name: "dropuser",
            authorization: [
              {
                actor: "platform",
                permission: "active"
              }
            ],
            data: { id }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );

  it("should process next round correctly", async () => {
    await sleep(6e3);
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 123
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 1105
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 1200
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 1007
    });
    await lockArUpdate();
    await updateAttentionRateMulti([
      {
        id: 123,
        attention_rate: 0,
        attention_rate_rating_position: 0xffffffff,
        stat_diff: [50, 11, 25, 50],
        posts_ranked_in_period: 6
      },
      {
        id: 1105,
        attention_rate: 50,
        attention_rate_rating_position: 3,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1200,
        attention_rate: 250.0,
        attention_rate_rating_position: 2,
        stat_diff: [51, 120, 210, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1007,
        attention_rate: 300.0,
        attention_rate_rating_position: 1,
        stat_diff: [51, 10, 210, 30],
        posts_ranked_in_period: 10
      }
    ]);
    await lockUpdate();
    await verifyStatesAndAccounts();
    await api.transact(
      {
        actions: [
          {
            account,
            name: "nextround",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {}
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
    await verifyAccountsBalances(["test2", "test1", "snax", "platform"]);
    await verifyStatesAndAccounts();
    await api.transact(
      {
        actions: [
          {
            account,
            name: "sendpayments",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              lower_account_name: "",
              account_count: 1000
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
    await verifyStatesAndAccounts();
    await verifyAccountsBalances(["test2", "test1", "snax", "platform"]);
  });

  it("should process nextround with attempt to update same accounts second time", async () => {
    await sleep(6e3);
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 123
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 1105
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test3",
      id: 1200
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test4",
      id: 1007
    });
    await lockArUpdate();
    await updateAttentionRateMulti([
      {
        id: 123,
        attention_rate: 0,
        attention_rate_rating_position: 0xffffffff,
        stat_diff: [50, 11, 25, 50],
        posts_ranked_in_period: 6
      },
      {
        id: 1105,
        attention_rate: 50,
        attention_rate_rating_position: 3,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1200,
        attention_rate: 250.0,
        attention_rate_rating_position: 2,
        stat_diff: [51, 120, 210, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1007,
        attention_rate: 300.0,
        attention_rate_rating_position: 1,
        stat_diff: [51, 10, 210, 30],
        posts_ranked_in_period: 10
      }
    ]);
    await lockUpdate();
    await verifyStatesAndAccounts();
    await api.transact(
      {
        actions: [
          {
            account,
            name: "nextround",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {}
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
    await verifyAccountsBalances([
      "test2",
      "test1",
      "test3",
      "test4",
      "snax",
      "platform"
    ]);
    await api.transact(
      {
        actions: [
          {
            account,
            name: "sendpayments",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              lower_account_name: "",
              account_count: 2
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
    await verifyStatesAndAccounts();
    await tryCatchExpect(() =>
      api.transact(
        {
          actions: [
            {
              account,
              name: "sendpayments",
              authorization: [
                {
                  actor: account,
                  permission: "active"
                }
              ],
              data: {
                lower_account_name: "",
                account_count: 2
              }
            }
          ]
        },
        {
          blocksBehind: 1,
          expireSeconds: 30
        }
      )
    );
    await tryCatchExpect(() =>
      api.transact(
        {
          actions: [
            {
              account,
              name: "sendpayments",
              authorization: [
                {
                  actor: account,
                  permission: "active"
                }
              ],
              data: {
                lower_account_name: "test1",
                account_count: 2
              }
            }
          ]
        },
        {
          blocksBehind: 1,
          expireSeconds: 30
        }
      )
    );
    await api.transact(
      {
        actions: [
          {
            account,
            name: "sendpayments",
            authorization: [
              {
                actor: account,
                permission: "active"
              }
            ],
            data: {
              lower_account_name: "test3",
              account_count: 2
            }
          }
        ]
      },
      {
        blocksBehind: 1,
        expireSeconds: 30
      }
    );
    await verifyStatesAndAccounts();
    await verifyAccountsBalances([
      "test2",
      "test1",
      "test3",
      "test4",
      "snax",
      "platform"
    ]);
  });

  it("deactivates and activates account", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateOrCreate({
      id: 1007,
      attention_rate: 300.0,
      attention_rate_rating_position: 1,
      stat_diff: [51, 10, 210, 30],
      posts_ranked_in_period: 10
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 1007
    });
    await deactivate(1007);
    await verifyStatesAndAccounts();
    await activate(1007);
    await verifyStatesAndAccounts();
  });

  it("drops user after updatear", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateOrCreate({
      id: 1007,
      attention_rate: 300.0,
      attention_rate_rating_position: 1,
      stat_diff: [51, 10, 210, 30],
      posts_ranked_in_period: 10
    });
    await verifyStatesAndAccounts();
    await dropUser(1007);
    await verifyStatesAndAccounts();
  });

  it("drops account after updatear", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateOrCreate({
      id: 1007,
      attention_rate: 300.0,
      attention_rate_rating_position: 1,
      stat_diff: [51, 10, 210, 30],
      posts_ranked_in_period: 10
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 1007
    });
    await verifyStatesAndAccounts();
    await dropAccount(1007);
    await verifyStatesAndAccounts();
  });

  it("updates account using updatear method second time", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateOrCreate({
      id: 1007,
      attention_rate: 300.0,
      attention_rate_rating_position: 1,
      stat_diff: [51, 10, 210, 30],
      posts_ranked_in_period: 10
    });
    await updateAttentionRateOrCreate({
      id: 1007,
      attention_rate: 300.0,
      attention_rate_rating_position: 1,
      stat_diff: [51, 10, 210, 30],
      posts_ranked_in_period: 10
    });
    await verifyStatesAndAccounts();
  });

  it("adds account after updatear", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateOrCreate({
      id: 1007,
      attention_rate: 300.0,
      attention_rate_rating_position: 1,
      stat_diff: [51, 10, 210, 30],
      posts_ranked_in_period: 10
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 1007
    });
    await verifyStatesAndAccounts();
  });

  it("updates the same accounts again during one step", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateMultiOrCreate([
      {
        id: 123,
        attention_rate: 0,
        attention_rate_rating_position: 0xffffffff,
        stat_diff: [50, 11, 25, 50],
        posts_ranked_in_period: 6
      },
      {
        id: 1105,
        attention_rate: 50,
        attention_rate_rating_position: 3,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1200,
        attention_rate: 250.0,
        attention_rate_rating_position: 2,
        stat_diff: [51, 120, 210, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1007,
        attention_rate: 300.0,
        attention_rate_rating_position: 1,
        stat_diff: [51, 10, 210, 30],
        posts_ranked_in_period: 10
      }
    ]);
    await updateAttentionRateMultiOrCreate([
      {
        id: 123,
        attention_rate: 0,
        attention_rate_rating_position: 0xffffffff,
        stat_diff: [50, 11, 25, 50],
        posts_ranked_in_period: 6
      },
      {
        id: 1105,
        attention_rate: 50,
        attention_rate_rating_position: 3,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1200,
        attention_rate: 250.0,
        attention_rate_rating_position: 2,
        stat_diff: [51, 120, 210, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1007,
        attention_rate: 300.0,
        attention_rate_rating_position: 1,
        stat_diff: [51, 10, 210, 30],
        posts_ranked_in_period: 10
      }
    ]);
    await verifyStatesAndAccounts();
  });

  it("creates accounts using updatearmult method", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateMultiOrCreate([
      {
        id: 123,
        attention_rate: 0,
        attention_rate_rating_position: 0xffffffff,
        stat_diff: [50, 11, 25, 50],
        posts_ranked_in_period: 6
      },
      {
        id: 1105,
        attention_rate: 50,
        attention_rate_rating_position: 3,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1200,
        attention_rate: 250.0,
        attention_rate_rating_position: 2,
        stat_diff: [51, 120, 210, 30],
        posts_ranked_in_period: 10
      },
      {
        id: 1007,
        attention_rate: 300.0,
        attention_rate_rating_position: 1,
        stat_diff: [51, 10, 210, 30],
        posts_ranked_in_period: 10
      }
    ]);
    await verifyStatesAndAccounts();
  });

  it("shouldn't be able to update attention rate when platform is updating", async () => {
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 1105
    });
    await lockArUpdate();
    await lockUpdate();
    await tryCatchExpect(() =>
      updateAttentionRate({
        id: 1105,
        attention_rate: 20.0,
        attention_rate_rating_position: 1,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 16
      })
    );
    await tryCatchExpect(() =>
      updateAttentionRateMulti([
        {
          id: 1105,
          attention_rate: 20.0,
          attention_rate_rating_position: 1,
          stat_diff: [5, 10, 20, 30],
          posts_ranked_in_period: 117
        }
      ])
    );
    await verifyStatesAndAccounts();
  });

  it("should process social transfer correctly", async () => {
    await initialize();
    await socialTransfer("test.transf", 15, "20.0000 SNAX", "hello");
    await verifyTransferTable("SNAX");
    await verifyAccountsBalances(["test.transf", "test1"]);
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 15
    });
    await verifyTransferTable("SNAX");
    await verifyAccountsBalances(["test.transf", "test1"]);
  });

  it("should create user using newaccount method", async () => {
    await initialize();
    await addCreator("snax.creator");
    await newUser({
      platform: "platform",
      account: "created11",
      bytes: 4000,
      stake_net: "100.0000 SNAX",
      stake_cpu: "50.0000 SNAX",
      transfer: false,
      active: {
        threshold: 1,
        delay_sec: 0,
        waits: [],
        accounts: [],
        keys: [
          {
            key: "SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV",
            weight: 1
          }
        ]
      },
      owner: {
        threshold: 1,
        delay_sec: 0,
        waits: [],
        accounts: [
          {
            permission: { actor: "snax.creator", permission: "active" },
            weight: 1
          }
        ],
        keys: []
      },
      id: 65,
      verification_post: 43,
      verification_salt: "hello",
      stat_diff: [0, 0, 0]
    });
    await verifyStatesAndAccounts();
  });

  it("creates account using updatear method", async () => {
    await initialize();
    await lockArUpdate();
    await updateAttentionRateOrCreate({
      id: 1007,
      attention_rate: 300.0,
      attention_rate_rating_position: 1,
      stat_diff: [51, 10, 210, 30],
      posts_ranked_in_period: 10
    });
    await verifyStatesAndAccounts();
  });

  it("shouldnt be able to create user using newaccount method", async () => {
    await initialize();
    await tryCatchExpect(() =>
      newUser({
        platform: "platform",
        account: "created11",
        bytes: 4000,
        stake_net: "100.0000 SNAX",
        stake_cpu: "50.0000 SNAX",
        transfer: false,
        active: {
          threshold: 1,
          delay_sec: 0,
          waits: [],
          accounts: [],
          keys: [
            {
              key: "SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV",
              weight: 1
            }
          ]
        },
        owner: {
          threshold: 1,
          delay_sec: 0,
          waits: [],
          accounts: [
            {
              permission: { actor: "snax.creator", permission: "active" },
              weight: 1
            }
          ],
          keys: []
        },
        id: 65,
        verification_post: 43,
        verification_salt: "hello",
        stat_diff: [0, 0, 0]
      })
    );
    await verifyStatesAndAccounts();
  });

  it("should process social transfers with different assets correctly", async () => {
    await initialize();
    await addSymbol("SNIX", 4);
    await Promise.all([
      socialTransfer("test.transf", 15, "20.0000 SNIX", "hello"),
      socialTransfer("test.transf", 16, "20.0000 SNAX", "hello"),
      socialTransfer("test.transf", 17, "20.0000 SNAX", "hello"),
      socialTransfer("test.transf", 30, "20.0000 SNIX", "hello")
    ]);
    await verifyTransferTable("SNAX");
    await verifyTransferTable("SNIX");
    await verifyAccountsBalances(["test.transf", "test1"]);
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 15
    });
    await verifyTransferTable("SNAX");
    await verifyTransferTable("SNIX");
    await verifyAccountsBalances(["test.transf", "test1"]);
  });

  it("should initialize correctly", async () => {
    await initialize();
    await verifyStatesAndAccounts();
  });

  it("shouldn't be able to initialize second time", async () => {
    await initialize();
    await tryCatchExpect(initialize);
    await verifyStatesAndAccounts();
  });

  it("should add account correctly", async () => {
    await initialize();
    const result = await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 123
    });
    await verifyStatesAndAccounts();
  });

  it("shouldn't be able to add user with the same id second time", async () => {
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 123
    });
    await tryCatchExpect(() =>
      addUser({
        verification_salt: "12345",
        stat_diff: [5, 10, 15],
        verification_post: "1083836521751478272",
        account: "test2",

        attention_rate_rating_position: 2
      })
    );
    await verifyStatesAndAccounts();
  });

  it("should update account's attention rate correctly", async () => {
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 123
    });
    await lockArUpdate();
    await updateAttentionRate({
      id: 123,
      attention_rate: 20.0,
      attention_rate_rating_position: 1,
      stat_diff: [5, 10, 20, 30],
      posts_ranked_in_period: 7
    });
    await verifyStatesAndAccounts();
  });

  it("should update multiple account's attention rate correctly", async () => {
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 123
    });
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 243
    });
    await lockArUpdate();
    await updateAttentionRateMulti([
      {
        id: 243,
        attention_rate: 20.0,
        attention_rate_rating_position: 2,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 6
      },
      {
        id: 123,
        attention_rate: 25.0,
        attention_rate_rating_position: 1,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 10
      }
    ]);
    await verifyStatesAndAccounts();
  });

  it("shouldn't be able to update non-existent account's attention rate", async () => {
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test2",
      id: 123
    });
    await tryCatchExpect(() =>
      updateAttentionRate({
        id: 250,
        attention_rate: 20.0,
        attention_rate_rating_position: 2,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 42
      })
    );

    await verifyStatesAndAccounts();
  });

  it("shouldn't be able to update attention rate when platform isnt in updating ar state", async () => {
    await initialize();
    await addUser({
      verification_salt: "12345",
      stat_diff: [5, 10, 15],
      verification_post: "1083836521751478272",
      account: "test1",
      id: 1105
    });
    await tryCatchExpect(() =>
      updateAttentionRate({
        id: 1105,
        attention_rate: 20.0,
        attention_rate_rating_position: 1,
        stat_diff: [5, 10, 20, 30],
        posts_ranked_in_period: 16
      })
    );
    await tryCatchExpect(() =>
      updateAttentionRateMulti([
        {
          id: 1105,
          attention_rate: 20.0,
          attention_rate_rating_position: 1,
          stat_diff: [5, 10, 20, 30],
          posts_ranked_in_period: 117
        }
      ])
    );
    await verifyStatesAndAccounts();
  });
});
