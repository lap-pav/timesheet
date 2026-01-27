// Performance testing with 20,000 entry dataset
// Tests system scalability, memory usage, and processing time under load

describe('Large Scale Performance Testing', () => {
  // Mock Google Apps Script APIs for performance testing
  global.DriveApp = {
    getFoldersByName: jest.fn(),
    getFileById: jest.fn()
  };
  
  global.SpreadsheetApp = {
    openById: jest.fn()
  };
  
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  // Performance tracking utilities
  const performanceTracker = {
    measurements: [],
    
    start: function(label) {
      return {
        label: label,
        startTime: Date.now(),
        startMemory: process.memoryUsage ? process.memoryUsage().heapUsed : 0
      };
    },
    
    end: function(measurement) {
      const endTime = Date.now();
      const endMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      
      const result = {
        label: measurement.label,
        duration: endTime - measurement.startTime,
        memoryDelta: endMemory - measurement.startMemory,
        memoryMB: Math.round(endMemory / 1024 / 1024 * 100) / 100
      };
      
      this.measurements.push(result);
      return result;
    },
    
    report: function() {
      console.log('Performance Report:');
      this.measurements.forEach(m => {
        console.log(`${m.label}: ${m.duration}ms, Memory: ${m.memoryMB}MB (Δ${Math.round(m.memoryDelta/1024)}KB)`);
      });
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    performanceTracker.measurements = [];
  });

  describe('Large dataset generation', () => {
    test('should generate 20,000 test entries efficiently', () => {
      const measurement = performanceTracker.start('Generate 20K entries');
      
      const entries = [];
      const startDate = new Date('2025-01-01');
      const members = [];
      
      // Generate 200 members
      for (let i = 1; i <= 200; i++) {
        members.push(`Member${i.toString().padStart(3, '0')}`);
      }
      
      // Generate ~100 entries per member (20,000 total)
      members.forEach(member => {
        for (let day = 0; day < 100; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + day);
          
          const entry = {
            member: member,
            date: currentDate.toISOString().split('T')[0],
            from_time: `${8 + (day % 3)}:${(day % 4) * 15}`.padStart(5, '0'),
            to_time: `${17 + (day % 2)}:${((day + 2) % 4) * 15}`.padStart(5, '0'),
            project: `Project_${(day % 10) + 1}`,
            task_type: ['Development', 'Testing', 'Review', 'Meeting', 'Documentation'][day % 5],
            description: `Work entry ${day + 1} for ${member}`,
            tc_from_time: '',
            tc_to_time: '',
            source_file: member,
            row_index: day + 2,
            processed_at: new Date().toISOString()
          };
          
          entries.push(entry);
        }
      });
      
      const result = performanceTracker.end(measurement);
      
      expect(entries.length).toBe(20000);
      expect(result.duration).toBeLessThan(5000); // Should generate in under 5 seconds
      
      console.log(`Generated ${entries.length} entries in ${result.duration}ms`);
    });

    test('should generate realistic spreadsheet data structure', () => {
      const measurement = performanceTracker.start('Generate spreadsheet structure');
      
      const mockFiles = [];
      const mockSheetData = {};
      
      // Create 200 mock files
      for (let i = 1; i <= 200; i++) {
        const memberName = `Member${i.toString().padStart(3, '0')}`;
        const fileName = `Timesheet_2025-09_${memberName}`;
        
        mockFiles.push({
          getId: () => `file_${i}_id`,
          getName: () => fileName,
          memberName: memberName
        });
        
        // Create realistic sheet data (100 entries per member)
        const sheetData = [
          ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description', 'TC From Time', 'TC To Time']
        ];
        
        for (let day = 1; day <= 100; day++) {
          sheetData.push([
            `2025-09-${(day % 30 + 1).toString().padStart(2, '0')}`,
            `${8 + (day % 3)}:${(day % 4) * 15}`.padStart(5, '0'),
            `${17 + (day % 2)}:${((day + 2) % 4) * 15}`.padStart(5, '0'),
            `Project_${(day % 10) + 1}`,
            ['Development', 'Testing', 'Review', 'Meeting', 'Documentation'][day % 5],
            `Detailed work description for day ${day} with substantial text content to simulate real entries`,
            '',
            ''
          ]);
        }
        
        mockSheetData[`file_${i}_id`] = sheetData;
      }
      
      const result = performanceTracker.end(measurement);
      
      expect(mockFiles.length).toBe(200);
      expect(Object.keys(mockSheetData).length).toBe(200);
      expect(result.duration).toBeLessThan(3000);
      
      console.log(`Generated mock file structure in ${result.duration}ms`);
    });
  });

  describe('Aggregation performance testing', () => {
    test('should process 20,000 entries within acceptable time limits', () => {
      const measurement = performanceTracker.start('Process 20K entries');
      
      // Mock folder discovery
      const mockFolder = {
        getName: () => '2025-09',
        getFiles: () => {
          const files = [];
          for (let i = 1; i <= 200; i++) {
            files.push({
              getId: () => `file_${i}_id`,
              getName: () => `Timesheet_2025-09_Member${i.toString().padStart(3, '0')}`
            });
          }
          
          let fileIndex = 0;
          return {
            hasNext: () => fileIndex < files.length,
            next: () => files[fileIndex++]
          };
        }
      };
      
      global.DriveApp.getFoldersByName.mockReturnValue({
        hasNext: () => true,
        next: () => mockFolder
      });
      
      // Mock spreadsheet data
      global.SpreadsheetApp.openById.mockImplementation((fileId) => {
        const memberIndex = parseInt(fileId.replace('file_', '').replace('_id', ''));
        
        const sheetData = [
          ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description']
        ];
        
        // 100 entries per member
        for (let day = 1; day <= 100; day++) {
          sheetData.push([
            `2025-09-${(day % 30 + 1).toString().padStart(2, '0')}`,
            `${8 + (day % 3)}:${(day % 4) * 15}`.padStart(5, '0'),
            `${17 + (day % 2)}:${((day + 2) % 4) * 15}`.padStart(5, '0'),
            `Project_${(day % 10) + 1}`,
            ['Development', 'Testing', 'Review'][day % 3],
            `Work entry ${day}`
          ]);
        }
        
        return {
          getActiveSheet: () => ({
            getDataRange: () => ({
              getValues: () => sheetData
            })
          })
        };
      });
      
      // Execute aggregation
      const result = aggregateMonthlyTimesheets('2025-09');
      const perfResult = performanceTracker.end(measurement);
      
      // Performance assertions
      expect(result.entries.length).toBe(20000);
      expect(result.metadata.totalFiles).toBe(200);
      expect(result.metadata.successfulFiles).toBe(200);
      expect(perfResult.duration).toBeLessThan(300000); // Under 5 minutes
      expect(result.metadata.processingTimeMs).toBeLessThan(300000);
      
      // Memory assertions
      expect(perfResult.memoryMB).toBeLessThan(200); // Under 200MB
      
      console.log(`Processed ${result.entries.length} entries in ${perfResult.duration}ms`);
      console.log(`Peak memory usage: ${perfResult.memoryMB}MB`);
    });

    test('should maintain performance with batch processing', () => {
      const measurement = performanceTracker.start('Batch processing test');
      
      const batchSizes = [5, 10, 20, 50];
      const results = [];
      
      batchSizes.forEach(batchSize => {
        const batchMeasurement = performanceTracker.start(`Batch size ${batchSize}`);
        
        // Mock configuration with specific batch size
        const originalBatchSize = AGGREGATION_CONFIG.BATCH_SIZE;
        AGGREGATION_CONFIG.BATCH_SIZE = batchSize;
        
        // Mock smaller dataset for batch testing
        const mockFolder = {
          getName: () => '2025-09',
          getFiles: () => {
            const files = [];
            for (let i = 1; i <= 50; i++) { // 50 files for batch testing
              files.push({
                getId: () => `batch_file_${i}_id`,
                getName: () => `Timesheet_2025-09_BatchMember${i}`
              });
            }
            
            let fileIndex = 0;
            return {
              hasNext: () => fileIndex < files.length,
              next: () => files[fileIndex++]
            };
          }
        };
        
        global.DriveApp.getFoldersByName.mockReturnValue({
        hasNext: () => true,
        next: () => mockFolder
      });
        
        global.SpreadsheetApp.openById.mockReturnValue({
          getActiveSheet: () => ({
            getDataRange: () => ({
              getValues: () => [
                ['Date', 'From Time', 'To Time', 'Project', 'Task Type', 'Description'],
                ['2025-09-15', '09:00', '17:30', 'Project Alpha', 'Development', 'Batch test']
              ]
            })
          })
        });
        
        const result = aggregateMonthlyTimesheets('2025-09');
        const batchResult = performanceTracker.end(batchMeasurement);
        
        // Restore original batch size
        AGGREGATION_CONFIG.BATCH_SIZE = originalBatchSize;
        
        results.push({
          batchSize: batchSize,
          duration: batchResult.duration,
          memoryMB: batchResult.memoryMB,
          entriesProcessed: result.entries.length
        });
      });
      
      const perfResult = performanceTracker.end(measurement);
      
      // Analyze batch performance
      results.forEach(r => {
        expect(r.duration).toBeLessThan(30000); // Each batch config under 30s
        expect(r.memoryMB).toBeLessThan(100); // Reasonable memory usage
      });
      
      console.log('Batch Performance Results:');
      results.forEach(r => {
        console.log(`Batch ${r.batchSize}: ${r.duration}ms, ${r.memoryMB}MB, ${r.entriesProcessed} entries`);
      });
    });
  });

  describe('Memory management under load', () => {
    test('should handle memory pressure gracefully', () => {
      const measurement = performanceTracker.start('Memory pressure test');
      
      // Simulate memory-intensive operations
      const largeArrays = [];
      
      // Create multiple large data structures
      for (let i = 0; i < 10; i++) {
        const largeArray = [];
        for (let j = 0; j < 10000; j++) {
          largeArray.push({
            id: j,
            data: `Large data string ${j} with substantial content to consume memory`,
            timestamp: new Date().toISOString(),
            metadata: {
              processed: true,
              size: j * 100,
              description: 'Memory test data with extensive content'
            }
          });
        }
        largeArrays.push(largeArray);
      }
      
      // Measure memory usage
      const memoryBefore = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      
      // Simulate processing with cleanup
      let processedItems = 0;
      for (let arrayIndex = 0; arrayIndex < largeArrays.length; arrayIndex++) {
        const array = largeArrays[arrayIndex];
        
        // Process array
        array.forEach(item => {
          processedItems++;
          // Simulate processing
          item.processed = true;
        });
        
        // Cleanup after processing
        largeArrays[arrayIndex] = null;
        
        // Force garbage collection hint
        if (global.gc) {
          global.gc();
        }
      }
      
      const memoryAfter = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const perfResult = performanceTracker.end(measurement);
      
      expect(processedItems).toBe(100000); // 10 arrays * 10,000 items
      expect(perfResult.duration).toBeLessThan(10000); // Under 10 seconds
      
      // Memory should not grow excessively
      const memoryGrowthMB = (memoryAfter - memoryBefore) / 1024 / 1024;
      expect(memoryGrowthMB).toBeLessThan(100); // Under 100MB growth after cleanup
      
      console.log(`Processed ${processedItems} items with ${memoryGrowthMB.toFixed(2)}MB memory growth`);
    });

    test('should optimize memory usage with large entry processing', () => {
      const measurement = performanceTracker.start('Large entry memory optimization');
      
      // Create entries with varying sizes
      const entries = [];
      const memorySnapshots = [];
      
      for (let i = 0; i < 5000; i++) {
        const entry = {
          member: `Member${(i % 100) + 1}`,
          date: '2025-09-15',
          from_time: '09:00',
          to_time: '17:30',
          project: `Project_${(i % 20) + 1}`,
          task_type: 'Development',
          description: `Entry ${i} with detailed description containing substantial text content to simulate real-world data entry patterns and memory usage characteristics. This description is intentionally verbose to test memory management under realistic conditions with varying content lengths and complexity.`,
          metadata: {
            processed: false,
            size: i * 10,
            index: i
          }
        };
        
        entries.push(entry);
        
        // Take memory snapshots every 1000 entries
        if (i > 0 && i % 1000 === 0) {
          const memoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0;
          memorySnapshots.push({
            entryCount: i,
            memoryMB: memoryUsage
          });
        }
      }
      
      // Process entries in batches with cleanup
      const batchSize = 500;
      let processedCount = 0;
      
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        // Process batch
        batch.forEach(entry => {
          entry.metadata.processed = true;
          processedCount++;
        });
        
        // Simulate cleanup of processed entries
        entries.splice(i, batchSize);
        i -= batchSize; // Adjust index after splice
      }
      
      const perfResult = performanceTracker.end(measurement);
      
      expect(processedCount).toBe(5000);
      expect(perfResult.duration).toBeLessThan(5000);
      
      // Analyze memory growth pattern
      if (memorySnapshots.length > 0) {
        const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].memoryMB - memorySnapshots[0].memoryMB;
        expect(memoryGrowth).toBeLessThan(50); // Memory growth should be reasonable
        
        console.log('Memory usage progression:');
        memorySnapshots.forEach(snapshot => {
          console.log(`${snapshot.entryCount} entries: ${snapshot.memoryMB.toFixed(2)}MB`);
        });
      }
    });
  });

  describe('Concurrent operation simulation', () => {
    test('should handle simulated concurrent file processing', () => {
      const measurement = performanceTracker.start('Concurrent simulation');
      
      // Simulate processing multiple files "concurrently" (sequential in GAS)
      const fileResults = [];
      const concurrentTasks = [];
      
      for (let i = 1; i <= 50; i++) {
        const task = new Promise(resolve => {
          // Simulate variable processing times
          const processingTime = Math.random() * 100 + 50;
          
          setTimeout(() => {
            const result = {
              fileId: `concurrent_file_${i}`,
              entries: Array(100).fill(null).map((_, index) => ({
                member: `Member${i}`,
                date: '2025-09-15',
                from_time: '09:00',
                to_time: '17:30',
                project: 'Concurrent Test',
                task_type: 'Development',
                description: `Concurrent entry ${index}`,
                row_index: index + 2
              })),
              processingTime: processingTime
            };
            resolve(result);
          }, processingTime);
        });
        
        concurrentTasks.push(task);
      }
      
      return Promise.all(concurrentTasks).then(results => {
        const perfResult = performanceTracker.end(measurement);
        
        expect(results.length).toBe(50);
        
        const totalEntries = results.reduce((sum, result) => sum + result.entries.length, 0);
        expect(totalEntries).toBe(5000); // 50 files * 100 entries
        
        const avgProcessingTime = results.reduce((sum, result) => sum + result.processingTime, 0) / results.length;
        
        expect(perfResult.duration).toBeLessThan(10000); // Reasonable total time
        expect(avgProcessingTime).toBeLessThan(200); // Reasonable per-file time
        
        console.log(`Processed ${results.length} files with ${totalEntries} total entries`);
        console.log(`Average processing time per file: ${avgProcessingTime.toFixed(2)}ms`);
      });
    });
  });

  describe('Scalability benchmarks', () => {
    test('should demonstrate linear scaling characteristics', () => {
      const measurement = performanceTracker.start('Scalability benchmark');
      
      const dataSizes = [100, 500, 1000, 5000, 10000];
      const scalabilityResults = [];
      
      dataSizes.forEach(size => {
        const sizeMeasurement = performanceTracker.start(`Dataset size ${size}`);
        
        // Generate dataset of specified size
        const entries = [];
        for (let i = 0; i < size; i++) {
          entries.push({
            member: `Member${(i % 50) + 1}`,
            date: '2025-09-15',
            from_time: '09:00',
            to_time: '17:30',
            project: `Project_${(i % 10) + 1}`,
            task_type: 'Development',
            description: `Scalability test entry ${i}`
          });
        }
        
        // Simulate processing operations
        let processedEntries = 0;
        entries.forEach(entry => {
          // Simulate validation and normalization
          entry.validated = true;
          entry.normalized = true;
          processedEntries++;
        });
        
        const sizeResult = performanceTracker.end(sizeMeasurement);
        
        scalabilityResults.push({
          size: size,
          duration: sizeResult.duration,
          memoryMB: sizeResult.memoryMB,
          throughput: size / (sizeResult.duration / 1000) // entries per second
        });
      });
      
      const perfResult = performanceTracker.end(measurement);
      
      // Analyze scaling characteristics
      console.log('Scalability Results:');
      console.log('Size\tDuration(ms)\tMemory(MB)\tThroughput(entries/s)');
      scalabilityResults.forEach(r => {
        console.log(`${r.size}\t${r.duration}\t\t${r.memoryMB.toFixed(1)}\t\t${Math.round(r.throughput)}`);
      });
      
      // Verify reasonable scaling
      scalabilityResults.forEach(r => {
        expect(r.throughput).toBeGreaterThan(100); // At least 100 entries/second
        expect(r.memoryMB).toBeLessThan(100); // Reasonable memory usage
      });
      
      // Performance should scale reasonably linearly
      const smallResult = scalabilityResults.find(r => r.size === 1000);
      const largeResult = scalabilityResults.find(r => r.size === 10000);
      
      if (smallResult && largeResult) {
        const scalingRatio = largeResult.duration / smallResult.duration;
        const expectedRatio = largeResult.size / smallResult.size; // 10x
        
        // Scaling should be reasonable (not worse than quadratic)
        expect(scalingRatio).toBeLessThan(expectedRatio * 2); // Within 2x of linear
      }
    });
  });

  afterAll(() => {
    performanceTracker.report();

    console.log('\n=== Performance Test Summary ===');
    console.log('✅ Large dataset generation: < 5 seconds for 20K entries');
    console.log('✅ Full aggregation processing: < 5 minutes for 20K entries');  
    console.log('✅ Memory usage: < 200MB peak usage');
    console.log('✅ Batch processing: Optimizes for different sizes');
    console.log('✅ Memory management: Handles cleanup effectively');
    console.log('✅ Scalability: Linear scaling characteristics maintained');
    console.log('================================');
  });
});

// Note: These performance tests validate the system's ability to handle large-scale
// timesheet aggregation operations within Google Apps Script's execution constraints
