import pathStore from "../store/path";
import Editor from "../components/Editor";

export default function Home() {
  const segments = pathStore(state => state.segments)
  const shapes = pathStore(state => state.shapes)
  const createSegment = pathStore(state => state.createSegment)

  return (
    <div className="container mx-auto">
      <div className="flex flex-wrap -mx-3 overflow-hidden">
        <div className="my-3 px-3 w-1/3 overflow-hidden">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <button onClick={() => {createSegment()}} type="button" className="w-full items-center mt-5 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                Add segment
              </button>
              <hr />
              {segments.map((segment, i) =>
                <div key={i} className="text-xs">
                  #{i}:&nbsp;
                  {segment.command} to
                  <strong className="mx-1">
                    ({parseFloat(segment.target.x).toFixed(2)},&nbsp;
                    {parseFloat(segment.target.y).toFixed(2)},&nbsp;
                    {parseFloat(segment.target.z).toFixed(2)})
                  </strong>
                  {segment.editing &&
                  <span
                    className="text-red-600 font-bold">editing</span>
                  }
                </div>
              )}
              <hr />
              <pre className="mx-1">
                Segments: {JSON.stringify(segments, null, 2)}
              </pre>
              <pre className="mx-1">
                Shapes: {JSON.stringify(shapes, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="my-3 px-3 w-2/3 overflow-hidden">
          <Editor />
        </div>

      </div>
    </div>
  )
}
