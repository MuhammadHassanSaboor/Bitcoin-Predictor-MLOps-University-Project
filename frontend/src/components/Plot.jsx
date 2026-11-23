import Plotly from "plotly.js-finance-dist-min";
import factoryModule from "react-plotly.js/factory";

// react-plotly.js is CommonJS; Vite may wrap it in { default }.
const createPlotlyComponent = factoryModule.default || factoryModule;
const Plot = createPlotlyComponent(Plotly);

export default Plot;
