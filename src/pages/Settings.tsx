/** Settings for the game.  This page is loaded once before a game starts to determine rules and player count. */
import { useForm } from "@tanstack/react-form";
import Footer from "components/Layout/footer";
import { motion } from "motion/react";
import { GiFrogFoot } from "react-icons/gi";
import { PlayerColors } from "types";

export function SettingsPage() {
  const form = useForm({
    defaultValues: {
      players: [
        {
          id: "1",
          name: "Player 1",
          mode: "human",
        },
        {
          id: "2",
          name: "Player 2",
          mode: "human",
        },
      ],
      winCols: 3,
    },
    onSubmit: async (values) => {
      window.location.href = "/game";
      // Here you would typically handle the form submission, e.g., save to state or send to server
    },
  });

  return (
    <div className="flex flex-col items-center h-screen w-screen">
      <h1 className="m-2 text-2xl font-bold uppercase">Settings</h1>
      <div className="flex flex-col items-center justify-center">
        <h2 className="m-2 text-xl font-bold">Players</h2>
        <form
          className="flex flex-col items-center"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="players" mode="array">
            {(field) => (
              <div className="px-2 border-b border-gray-400 mb-6 flex flex-col justify-center items-center">
                <div className="flex flex-row items-center justify-center h-12 my-4">
                  <button
                    disabled={field.state.value.length >= 4}
                    className="p-2 h-12 w-12 border rounded mx-2 bg-blue-400 text-white disabled:bg-gray-300 disabled:text-gray-500"
                    onClick={() =>
                      field.pushValue({
                        name: `Player ${field.state.value.length + 1}`,
                        mode: "human",
                        id: `${field.state.value.length + 1}`,
                      })
                    }
                    type="button"
                  >
                    +
                  </button>
                  <button
                    disabled={field.state.value.length <= 2}
                    className="p-2 h-12 w-12 border rounded mx-2 bg-blue-400 text-white disabled:bg-gray-300 disabled:text-gray-500"
                    onClick={() =>
                      field.removeValue(field.state.value.length - 1)
                    }
                    type="button"
                  >
                    -
                  </button>
                </div>
                {field.state.value.map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-row items-center justify-around h-10 my-4"
                  >
                    <GiFrogFoot
                      className={`m-2 w-16 h-16 text-${PlayerColors[index]}`}
                    />
                    <form.Field name={`players[${index}].name`}>
                      {(subField) => (
                        <input
                          className="p-2 h-full border rounded mx-2 w-1/2"
                          type="text"
                          placeholder="Name"
                          value={subField.state.value}
                          onChange={(e) => subField.setValue(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <form.Field name={`players[${index}].mode`}>
                      {(subField) => (
                        <select
                          className="h-full border rounded select mx-2"
                          value={subField.state.value}
                          onChange={(e) => subField.setValue(e.target.value)}
                        >
                          <option value="human">Human</option>
                          <option value="safe">Safe</option>
                          <option value="normal">Normal</option>
                          <option value="risky">Risky</option>
                        </select>
                      )}
                    </form.Field>
                  </div>
                ))}

                <h2 className="m-2 text-xl font-bold">Win Columns</h2>
                <form.Field name="winCols">
                  {(field) => (
                    <select
                      className="border rounded select mx-2 mb-6"
                      value={field.state.value}
                      onChange={(e) => field.setValue(Number(e.target.value))}
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                      <option value={6}>6</option>
                    </select>
                  )}
                </form.Field>
              </div>
            )}
          </form.Field>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <motion.button
                className="p-2 h-12 w-32 border rounded mx-2 bg-green-500 text-white disabled:bg-gray-300 disabled:text-gray-500"
                type="submit"
                disabled={!canSubmit}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  repeatType: "loop",
                  repeatDelay: 3,
                }}
              >
                {isSubmitting ? "..." : "Submit"}
              </motion.button>
            )}
          />
        </form>
      </div>
      <Footer />
    </div>
  );
}
