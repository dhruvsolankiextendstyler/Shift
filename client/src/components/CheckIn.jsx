import { useState } from "react";

function CheckIn() {
    const [mood, setMood] = useState("");
    const [energy, setEnergy] = useState("");
    const [time, setTime] = useState("");

    const handleSubmit = async () => {
        if (!mood || !energy || !time) {
            alert("Complete your check-in first.");
            return;
        }

        const checkInData = {
            mood,
            energy,
            availableTime: time
        };

        console.log("Check-in:", checkInData);
    };

    return (
        <div>
            <h2>How are you feeling?</h2>

            <div>
                <button onClick={() => setMood("low")}>Low</button>
                <button onClick={() => setMood("okay")}>Okay</button>
                <button onClick={() => setMood("good")}>Good</button>
                <button onClick={() => setMood("great")}>Great</button>
                <button onClick={() => setMood("angry")}>Angry</button>
                <button onClick={() => setMood("overwhelmed")}>
                    Overwhelmed
                </button>
            </div>

            <h2>What's your energy like?</h2>

            <div>
                <button onClick={() => setEnergy("low")}>Low</button>
                <button onClick={() => setEnergy("medium")}>Medium</button>
                <button onClick={() => setEnergy("high")}>High</button>
            </div>

            <h2>How much time do you have?</h2>

            <div>
                <button onClick={() => setTime(5)}>5 min</button>
                <button onClick={() => setTime(15)}>15 min</button>
                <button onClick={() => setTime(30)}>30 min</button>
                <button onClick={() => setTime(60)}>1 hour+</button>
            </div>

            <br />

            <button onClick={handleSubmit}>
                SHIFT →
            </button>

            <hr />

            <p>Mood: {mood}</p>
            <p>Energy: {energy}</p>
            <p>Time: {time ? `${time} minutes` : ""}</p>
        </div>
    );
}

export default CheckIn;