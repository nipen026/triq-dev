const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    permissions: {
      serviceDepartment: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },
      accessLevel: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },
      machineOperation: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },
      ticketManagement: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },
      approvalAuthority: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },
      reportAccess: {
        view: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeePermission", permissionSchema);
