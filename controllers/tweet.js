const Tweet = require("../models/Tweet.schema");
const { parseRoles } = require("../parser");
const roles = Object.values(require("../data/roles.json"))
  .flatMap((roles) => Object.keys(roles))
  .map((role) => ({ [role.toLowerCase().replace(/\s+/g, "")]: role }))
  .reduce((a, b) => ({ ...a, ...b }), {});
const categories = Object.keys(require("../data/roles.json"))
  .map((category) => ({
    [category.toLowerCase().replace(/\s+/g, "")]: category,
  }))
  .reduce((a, b) => ({ ...a, ...b }), {});

exports.findAll = async ({
  limit = 20,
  offset = 0,
  category,
  role,
  type,
  q,
}) => {
  //const mongoQuery = { $and: [{ need_manual_verification: false }] };
  const mongoQuery = {};

  if (unverified === "true")
    mongoQuery = { $and: [{ need_manual_verification: "true" }] };
  else
    mongoQuery = {
      $and: [{ need_manual_verification: { $in: ["false", "approved"] } }],
    };

  if (category) mongoQuery.categories = categories[category];
  if (type)
    mongoQuery.$and.push({
      $or: type
        .toLowerCase()
        .split(",")
        .map((type) => ({ type })),
    });

  if (role) {
    const or = role
      .toLowerCase()
      .split(",")
      .map((r) => {
        if (roles[r]) {
          return { roles: roles[r] };
        }
        throw new Error("Invalid role " + r);
      });

    mongoQuery.$and.push({ $or: or });
  }
  if (q) {
    // Errors are to be handled in the catch block of the function calling this
    if (q.length > 256) {
      throw new Error("Too long query.");
    }
    const or = parseRoles(q).map((role) => ({ roles: role }));

    if (or.length > 0) {
      mongoQuery.$and.push({ $or: or });
    } else {
      // Log the query for manual inspection for updating the keywords list if neccessary
    }
  }

  return (
    (await Tweet.find(mongoQuery, null, {
      limit: Number(limit),
      skip: Number(offset),
      sort: { created_on: -1 },
    }).exec()) || []
  );
};
