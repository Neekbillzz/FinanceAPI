import { useState } from "react";
import axios from "axios";


function BudgetForm() {

  const [form, setForm] = useState({
    name: "",
    category: "food",
    limit: "",
    period: "monthly",
    startDate: "",
    endDate: "",
  });

  const submitBudget = async (e) => {

    e.preventDefault();

    try {

      const token = localStorage.getItem("token");
      console.log("TOKEN:", token);


      const res = await axios.post(
        "http://localhost:5000/api/budgets",
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(res.data);

      alert("Budget created");

    } catch (err) {

      console.log(err.response?.data);

      alert(
        err.response?.data?.message ||
        "Failed to create budget"
      );

    }

  };

  return (

    <form onSubmit={submitBudget}>

      <input
        placeholder="Budget name"
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
      />

      <br /><br />

      <select
        onChange={(e) =>
          setForm({ ...form, category: e.target.value })
        }
      >

        <option value="food">Food</option>
        <option value="transport">Transport</option>
        <option value="shopping">Shopping</option>
        <option value="entertainment">Entertainment</option>

      </select>

      <br /><br />

      <input
        type="number"
        placeholder="Budget Limit"
        onChange={(e) =>
          setForm({ ...form, limit: e.target.value })
        }
      />

      <br /><br />

      <input
        type="date"
        onChange={(e) =>
          setForm({ ...form, startDate: e.target.value })
        }
      />

      <br /><br />

      <input
        type="date"
        onChange={(e) =>
          setForm({ ...form, endDate: e.target.value })
        }
      />

      <br /><br />

      <button type="submit">
        Save Budget
      </button>

    </form>

  );
}

export default BudgetForm;